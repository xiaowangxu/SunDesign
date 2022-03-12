import { typeCheck } from './sPARks.js';
import { SourceScript, SunDesignExpressionLexer, SunDesignExpressionParser, SunDesignExpressionTypeCheckPass, SunDesignExpressionOptimizationPass, SunDesignExpressionCodeGenPass, typeToString } from './SunDesignExpression.js';
import "./lib/mermaid.js";

mermaid.initialize({ startOnLoad: false });

function render_Graph(code) {
	return new Promise((resolve, reject) => {
		mermaid.render("Graph", code, (svg) => {
			resolve(svg);
		});
	});
}

function parse(S) {
	let pos = 0;
	let keepComments = false;
	let keepWhitespace = true;

	let openBracket = "<";
	let openBracketCC = "<".charCodeAt(0);
	let closeBracket = ">";
	let closeBracketCC = ">".charCodeAt(0);
	let minusCC = "-".charCodeAt(0);
	let slashCC = "/".charCodeAt(0);
	let exclamationCC = '!'.charCodeAt(0);
	let singleQuoteCC = "'".charCodeAt(0);
	let doubleQuoteCC = '"'.charCodeAt(0);
	let openCornerBracketCC = '['.charCodeAt(0);
	let closeCornerBracketCC = ']'.charCodeAt(0);

	/**
	 * parsing a list of entries
	 */
	function parseChildren(tagName) {
		let children = [];
		while (S[pos]) {
			if (S.charCodeAt(pos) == openBracketCC) {
				if (S.charCodeAt(pos + 1) === slashCC) {
					let closeStart = pos + 2;
					pos = S.indexOf(closeBracket, pos);

					let closeTag = S.substring(closeStart, pos)
					if (closeTag.indexOf(tagName) == -1) {
						let parsedText = S.substring(0, pos).split('\n');
						throw new Error(
							'Unexpected close tag\nLine: ' + (parsedText.length - 1) +
							'\nColumn: ' + (parsedText[parsedText.length - 1].length + 1) +
							'\nChar: ' + S[pos]
						);
					}

					if (pos + 1) pos += 1

					return children;
				} else if (S.charCodeAt(pos + 1) === exclamationCC) {
					if (S.charCodeAt(pos + 2) == minusCC) {
						//comment support
						const startCommentPos = pos;
						while (pos !== -1 && !(S.charCodeAt(pos) === closeBracketCC && S.charCodeAt(pos - 1) == minusCC && S.charCodeAt(pos - 2) == minusCC && pos != -1)) {
							pos = S.indexOf(closeBracket, pos + 1);
						}
						if (pos === -1) {
							pos = S.length
						}
						if (keepComments) {
							children.push(S.substring(startCommentPos, pos + 1));
						}
					} else if (
						S.charCodeAt(pos + 2) === openCornerBracketCC
						&& S.charCodeAt(pos + 8) === openCornerBracketCC
						&& S.substr(pos + 3, 5).toLowerCase() === 'cdata'
					) {
						// cdata
						let cdataEndIndex = S.indexOf(']]>', pos);
						if (cdataEndIndex == -1) {
							children.push(S.substr(pos + 9));
							pos = S.length;
						} else {
							children.push(S.substring(pos + 9, cdataEndIndex));
							pos = cdataEndIndex + 3;
						}
						continue;
					} else {
						// doctypesupport
						const startDoctype = pos + 1;
						pos += 2;
						let encapsuled = false;
						while ((S.charCodeAt(pos) !== closeBracketCC || encapsuled === true) && S[pos]) {
							if (S.charCodeAt(pos) === openCornerBracketCC) {
								encapsuled = true;
							} else if (encapsuled === true && S.charCodeAt(pos) === closeCornerBracketCC) {
								encapsuled = false;
							}
							pos++;
						}
						children.push(S.substring(startDoctype, pos));
					}
					pos++;
					continue;
				}
				let node = parseNode();
				children.push(node);
				if (node.tagName[0] === '?') {
					children.push(...node.children);
					node.children = [];
				}
			} else {
				let text = parseText();
				if (keepWhitespace) {
					if (text.length > 0) {
						children.push(text);
					}
				} else {
					text.attributes.text = text.attributes.text.trim();
					if (text.attributes.text.length > 0) {
						children.push(text);
					}
				}
				pos++;
			}
		}
		return children;
	}

	/**
	 *    returns the text outside of texts until the first '<'
	 */
	function parseText() {
		let start = pos;
		pos = S.indexOf(openBracket, pos) - 1;
		if (pos === -2)
			pos = S.length;
		const str = S.slice(start, pos + 1);
		return { tagName: "textContext", attributes: { text: str }, children: [] };
	}
	/**
	 *    returns text until the first nonAlphabetic letter
	 */
	let nameSpacer = '\r\n\t>/= ';

	function parseName() {
		let start = pos;
		while (nameSpacer.indexOf(S[pos]) === -1 && S[pos]) {
			pos++;
		}
		return S.slice(start, pos);
	}
	/**
	 *    is parsing a node, including tagName, Attributes and its children,
	 * to parse children it uses the parseChildren again, that makes the parsing recursive
	 */
	let NoChildNodes = []// || ['img', 'br', 'input', 'meta', 'link', 'hr'];

	function parseNode() {
		pos++;
		const tagName = parseName();
		const attributes = {};
		let children = [];

		// parsing attributes
		while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
			let c = S.charCodeAt(pos);
			if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
				//if('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(S[pos])!==-1 ){
				let name = parseName();
				let value = '';
				// search beginning of the string
				let code = S.charCodeAt(pos);
				while (code && code !== singleQuoteCC && code !== doubleQuoteCC && !((code > 64 && code < 91) || (code > 96 && code < 123)) && code !== closeBracketCC) {
					pos++;
					code = S.charCodeAt(pos);
				}
				if (code === singleQuoteCC || code === doubleQuoteCC) {
					value = parseString();
					if (pos === -1) {
						return {
							tagName,
							attributes,
							children,
						};
					}
				} else {
					value = null;
					pos--;
				}
				attributes[name] = value;
			}
			pos++;
		}
		// optional parsing of children
		if (S.charCodeAt(pos - 1) !== slashCC) {
			if (tagName == "script") {
				let start = pos + 1;
				pos = S.indexOf('</script>', pos);
				children = [S.slice(start, pos)];
				pos += 9;
			} else if (tagName == "style") {
				let start = pos + 1;
				pos = S.indexOf('</style>', pos);
				const STR = S.slice(start, pos)
				children = [{ tagName: 'textContext', attributes: { text: STR }, children: [] }];
				pos += 8;
			} else if (NoChildNodes.indexOf(tagName) === -1) {
				pos++;
				children = parseChildren(tagName);
			} else {
				pos++
			}
		} else {
			pos++;
		}
		return {
			tagName,
			attributes,
			children,
		};
	}

	/**
	 *    is parsing a string, that starts with a char and with the same usually  ' or "
	 */

	function parseString() {
		let startChar = S[pos];
		let startpos = pos + 1;
		pos = S.indexOf(startChar, startpos)
		const str = S.slice(startpos, pos);
		return str;
	}

	let out = null;
	out = parseChildren('');

	return out;
}

const sunlang = SunDesignExpressionParser

function parse_Constant(str, name = "Source") {
	const source = new SourceScript(str, name);
	const lexer = new SunDesignExpressionLexer(source);
	lexer.tokenize();
	if (lexer.errors.length > 0) {
		return [null, null, lexer.errors.map(err => {
			let [s, starter] = source.get_ScriptPortion(err.start, err.end, '^', undefined, false)
			return `${s}\n${starter}${err.type}`
		})]
	}
	const ast = sunlang.match(lexer.tokens);
	if (ast[3] !== undefined) {
		let err = ast[3];
		let errs;
		while (err !== undefined) {
			errs = err;
			err = err.last;
		}
		const first = errs;
		const [s, starter] = source.get_ScriptPortion(first.start, first.end, '^', undefined, false)
		return [null, null, [`${s}\n${starter}${first.type}\n${first.message.split('\n').map(i => starter + i).join('\n')}`]]
	}
	else {
		const walker = SunDesignExpressionTypeCheckPass;
		const [astnew, err] = walker.walk(source, ast[2][1]);
		if (err.length > 0) {
			return [null, null, err.map((err) => {
				const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
				return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
			})]
		}

		const walker2 = SunDesignExpressionOptimizationPass
		const [astnew2, err2] = walker2.walk(source, astnew);
		if (err2.length > 0) {
			return [null, null, err2.map((err) => {
				const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
				return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
			})]
		}

		// return [astnew2, []];
		const walker3 = SunDesignExpressionCodeGenPass
		const [code, opt] = walker3.generate(astnew2);
		return [code, opt, []];
	}
}

function parse_Expression(str, name = "Source", inputs, nodes) {
	const source = new SourceScript(str, name);
	const lexer = new SunDesignExpressionLexer(source);
	lexer.tokenize();
	if (lexer.errors.length > 0) {
		return [null, null, lexer.errors.map(err => {
			let [s, starter] = source.get_ScriptPortion(err.start, err.end, '^', undefined, false)
			return `${s}\n${starter}${err.type}`
		})]
	}
	const ast = sunlang.match(lexer.tokens);
	if (ast[3] !== undefined) {
		let err = ast[3];
		let errs;
		while (err !== undefined) {
			errs = err;
			err = err.last;
		}
		const first = errs;
		const [s, starter] = source.get_ScriptPortion(first.start, first.end, '^', undefined, false)
		return [null, null, [`${s}\n${starter}${first.type}\n${first.message.split('\n').map(i => starter + i).join('\n')}`]]
	}
	else {
		const walker = SunDesignExpressionTypeCheckPass;
		const [astnew, err] = walker.walk(source, ast[2][1], inputs, nodes);
		if (err.length > 0) {
			return [null, null, err.map((err) => {
				const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
				return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
			})]
		}

		const walker2 = SunDesignExpressionOptimizationPass
		const [astnew2, err2] = walker2.walk(source, astnew);
		if (err2.length > 0) {
			return [null, null, err2.map((err) => {
				const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
				return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
			})]
		}

		const walker3 = SunDesignExpressionCodeGenPass
		const [code, opt] = walker3.generate(astnew2);
		return [code, opt, []];
	}
}

function test_IdentifierName(name) {
	return /^[\_|a-zA-Z](\w)*$/.test(name);
}

function test_Number(num) {
	return /^[0-9]*$/.test(num);
}

export class XMLParser {
	constructor(str) {
		this.str = str;
		this.result = null;
		this.error = null;
		try {
			this.result = parse(this.str);
		}
		catch (err) {
			this.error = err;
		}
	}
}

export class ResourceLoader {
	constructor(env) {
		this.env = env;
	}

	load(url) {
		return Promise.resolve(null);
	}
}

export class ComponentWebLoader extends ResourceLoader {
	constructor(env) {
		super(env);
	}

	async load(url) {
		const str = await new Promise((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.open('get', url);
			request.send();
			request.onreadystatechange = () => {
				if (request.readyState === 4) {
					if (request.status === 200) {
						resolve(request.responseText);
						return;
					}
					throw new Error("XMLHttpRequest load failed");
				}
			};
		});
		return await new Promise((resolve, reject) => {
			try {
				const component = new SDML_Component(this.env, url, str, resolve, reject);
			}
			catch (err) {
				reject(err);
			}
		});
	}
}

export class Environment {
	constructor(loaders = {}) {
		this.uidgen = BigInt(0);
		this.urlmap = {};
		this.caches = {};
		this.promises = [];
		loaders = { component: ComponentWebLoader, ...loaders };
		this.loaders = {};
		for (let key in loaders) {
			this.loaders[key] = new loaders[key](this);
		}
	}

	is_ResourceType(loader) {
		return this.loaders[loader] !== undefined;
	}

	component(name, url) {
		if (this.urlmap[name] !== undefined) return;
		this.urlmap[name] = url;
		this.caches[url] = null;
		const promise = this.loaders.component.load(url).then((component) => {
			this.caches[url] = component;
			if (component instanceof SDML_Node) {
				component.compile();
			}
		});
		this.promises.push(promise);
	}

	load(loader, url) {
		if (this.caches[url] !== undefined) return Promise.resolve();
		this.caches[url] = null;
		const promise = this.loaders[loader].load(url).then((component) => {
			this.caches[url] = component;
			if (component instanceof SDML_Node) {
				component.compile();
			}
		});
		return promise;
	}

	onLoaded() {
		return Promise.all(this.promises);
	}

	get(url) {
		return this.caches[url];
	}

	get uid() {
		return this.uidgen++;
	}
}

class SDML_Node {
	constructor(env) {
		this.type = {
			node: 1
		};
		this.env = env;
		this.uid = this.env.uid;
		this.inputs = {};
		this.outputs = {};
		this.compiled = false;
	}

	compile() {
	}

	instance_of(_class) {
		return this instanceof _class
	}

	summary() {
		return `node_${this.uid.toString()}`;
	}

	get_Entries() {
		return [];
	}

	get_InputTypes() {
		return Types.NONE;
	}
}

const ALL_INPUTS_TYPES = {
	int: {
		default: (val) => { return val },
		datatype: () => create_BaseType('int')
	},
	float: {
		default: (val) => { return val },
		datatype: () => create_BaseType('float')
	},
	bool: {
		default: (val) => { return val },
		datatype: () => create_BaseType('bool')
	},
	vec2: {
		default: (val) => { return val },
		datatype: () => create_BaseType('vec2')
	},
}

function create_BaseType(type) {
	return {
		type: 'datatype',
		datatype: 'base',
		value: type
	}
}

class SDML_Component extends SDML_Node {
	constructor(env, url, sdml, onready, onreject) {
		super(env);
		this.url = url;
		this.xmlast = {
			refs: null,
			inputs: null,
			outputs: null,
			type: null,
			slots: null,
			template: null,
			export: null,
		};
		this.sdml = sdml;
		this.urlmap = {};
		this.slots = {};
		this.compile_res = null;
		this.onready = onready;
		this.onreject = onreject;
		this.parse_XML(sdml);
		this.pre_Compile();
		this.collect_Resources();
	}

	set_Ast(type, ast) {
		if (this.xmlast[type] === undefined) {
			throw new Error(`entry <${type}/> is not allowed in '${this.url}'`);
		}
		if (this.xmlast[type] === null) {
			this.xmlast[type] = ast;
		}
		else {
			throw new Error(`dupilcate entry <${type}/> found in '${this.url}'`);
		}
	}

	parse_XML(sdml) {
		const xmlparser = new XMLParser(sdml);
		if (xmlparser.error !== null) {
			throw new Error(`${xmlparser.error}`);
		}
		for (let i of xmlparser.result) {
			this.set_Ast(i.tagName, i.children);
		}
	}

	collect_Resources() {
		const refs = this.xmlast.refs ?? [];
		const promises = [];
		refs.forEach(ref => {
			if (!this.env.is_ResourceType(ref.tagName)) throw new Error(`<${ref.tagName} /> sub Resource is not loadable, try remove it from SDML or mount relative loader`);
			if (ref.attributes.url === undefined || ref.attributes.url === '') throw new Error("an SDML Component's sub Resource should always contain url attribute: <resource-type url=\"...\" />");
			if (ref.attributes.id === undefined || ref.attributes.id === '') throw new Error("an SDML Component's sub Resource should always contain id attribute: <resource-type id=\"...\" />");
			const id = ref.attributes.id;
			if (id in ALL_NODE_TYPES) throw new Error(`reserved SDML Component's sub Resource id '${id}' found in\n<refs>\n\t<${ref.tagName} id="${id}" />\n</refs>\nin ${this.url}`);
			if (id in this.urlmap) throw new Error(`duplicate SDML Component's sub Resource id '${id}' found in\n<refs>\n\t<${ref.tagName} id="${id}" />\n</refs>\nin ${this.url}`);
			const url = ref.attributes.url;
			this.urlmap[id] = url;
			promises.push(this.env.load(ref.tagName, url))
		})
		Promise.all(promises).then(() => {
			this.onready(this);
			delete this.onready;
			delete this.onreject;
		}).catch((err) => {
			this.onreject(err);
			delete this.onready;
			delete this.onreject;
		});
	}

	pre_Compile() {
		// console.log(`>>>>> '${this.url}' pre compile`);
		// inputs
		const inputs = this.xmlast.inputs ?? [];
		for (let i of inputs) {
			const type = i.tagName;
			const { default: defaultval, name } = i.attributes;
			if (name === undefined) {
				throw new Error(`input does not have a name in\n<inputs>\n\t<${type}/>\n</inputs>\nin ${this.url}`);
			}
			if (!test_IdentifierName(name)) {
				throw new Error(`input's name '${name}' in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nis invalid in ${this.url}`);
			}
			if (type in ALL_INPUTS_TYPES) {
				if (name in this.inputs) {
					throw new Error(`duplcate input found in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nis invalid in ${this.url}`);
				}
				else {
					const [code, opt, err] = parse_Constant(defaultval);
					if (err.length > 0) {
						throw new Error(`default value parse error in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nin ${this.url}:\n${err.join('\n\n')}`);
					}
					const datatype = ALL_INPUTS_TYPES[type].datatype();
					if (!opt.constant) {
						throw new Error(`default value is not constant in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nin ${this.url}`);
					}
					if (!typeCheck(datatype, opt.datatype)) {
						throw new Error(`default value is type of ${typeToString(ans.datatype)}, not type of ${type} in\n<inputs>\n\t<${type} name="${name}" default="${defaultval}"/>\n</inputs>\nin ${this.url}`);
					}
					// console.log(code, ans.datatype, ans.constant, ans.value, opt)
					this.inputs[name] = {
						uid: this.env.uid,
						default: code,
						datatype: datatype,
					}
				}
			}
			else {
				throw new Error(`input's type '${type}' in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nis invalid in ${this.url}`);
			}
		}
		// outputs
		const outputs = this.xmlast.outputs ?? [];
		for (let i of outputs) {
			const type = i.tagName;
			const { name } = i.attributes;
			if (name === undefined) {
				throw new Error(`output does not have a name in\n<outputs>\n\t<${type}/>\n</outputs>\nin ${this.url}`);
			}
			if (!test_IdentifierName(name)) {
				throw new Error(`output's name '${name}' in\n<outputs>\n\t<${type} name="${name}"/>\n</outputs>\nis invalid in ${this.url}`);
			}
			if (type in ALL_INPUTS_TYPES) {
				if (name in this.outputs) {
					throw new Error(`duplcate output found in\n<outputs>\n\t<${type} name="${name}"/>\n</outputs>\nis invalid in ${this.url}`);
				}
				else {
					this.outputs[name] = {
						uid: this.env.uid,
						datatype: ALL_INPUTS_TYPES[type].datatype(),
					}
				}
			}
			else {
				throw new Error(`output's type '${type}' in\n<outputs>\n\t<${type} name="${name}"/>\n</outputs>\nis invalid in ${this.url}`);
			}
		}

		// slots
		const slots = this.xmlast.slots ?? [];
		for (let i of slots) {
			const name = i.tagName;
			if (!test_IdentifierName(name)) {
				throw new Error(`slot's name '${name}' in\n<slots>\n\t<${name}/>\n</slots>\nis invalid in ${this.url}`);
			}
			if (name in this.slots) {
				throw new Error(`duplcate slot found in\n<slots>\n\t<${name}/>\n</slots>\nis invalid in ${this.url}`);
			}
			if (name in ALL_INPUTS_TYPES || name in this.urlmap) {
				throw new Error(`reserved tagName '${name}' found in\n<refs>\n\t<${ref.tagName} id="${id}" />\n</refs>\nin ${this.url}`);
			}
			else {
				const slot = {};
				for (let t of i.children) {
					const type = t.tagName;
					const { count } = t.attributes;
					if (count === undefined) {
						slot[type] = Infinity;
					}
					else if (test_Number(count)) {
						slot[type] = (slot[type] ?? 0) + parseInt(count);
					}
					else {
						throw new Error(`slot's type's count '${count}' in\n<slots>\n\t<${name}>\n\t\t<${type} count="${count}"/>\n\t</${name}></slots>\nis invalid in ${this.url}`)
					}
				}
				this.slots[name] = slot;
			}
		}

		// console.log(this.inputs, this.outputs);
	}

	compile() {
		// template types
		if (this.xmlast.type === null) {
			// self check
			const templates = this.xmlast.template ?? [];
			const type = new Types();
			for (let i of templates) {
				const name = i.tagName;
				let cut_type = null;
				if (name in ALL_NODE_TYPES) {
					const sub_type = ALL_NODE_TYPES[name].type
					if (sub_type === Types.NONE) {
						throw new Error(`type of node <${name}/> can not but directly resolved in\n<template>\n\t<${name}/>\n</template>\nin ${this.url}\nyou may want to use <type/> entry to define component's type explicitly, so the type check pass will be delayed after compiled the whole component`);
					}
					cut_type = sub_type;
				}
				else if (name in this.urlmap) {
					const subcom = this.env.get(this.urlmap[name]);
					if (subcom === null) {
						throw new Error(`possible circular refs found in ${this.url} when referencing ${this.urlmap[name]} as ${name}`);
					}
					cut_type = subcom.type.clone();
				}
				else {
					throw new Error(`type of node <${name}/> can not but directly resolved in\n<template>\n\t<${name}/>\n</template>\nin ${this.url}\nyou may want to use <type/> entry to define component's type explicitly`);
				}
				type.merge_TypesLocal(cut_type);
			}
			this.type = type;
		}
		else {
			// use def type
			const types = this.xmlast.type ?? [];
			const type = new Types();
			for (let i of types) {
				const name = i.tagName;
				const { count } = i.attributes;
				if (count === undefined) {
					type.merge_TypesLocal(new Types({ [name]: Infinity }));
				}
				else if (test_Number(count)) {
					type.merge_TypesLocal(new Types({ [name]: parseInt(count) }));
				}
				else {
					throw new Error(`type's count '${count}' in\n<type>\n\t<${name} count="${count}"/>\n</type>\nis invalid in ${this.url}`)
				}
			}
			this.type = type;
		}
		// try {
		this.compile_res = new SDML_Compile_Scope(this.env, this.urlmap, this.xmlast.template, this.inputs, this.outputs, null, {});
		this.type = this.compile_res.types;
		// console.log(this.compile_res.to_Mermaid())
		render_Graph(this.compile_res.to_Mermaid()).then(svg => {
			console.log(`Graph Preview:\n\t%c %c`, `border: black 1px solid; background: url("data:image/svg+xml;base64,${btoa(svg)}") no-repeat center; padding: 180px 180px; background-size: contain;`, "");
		})
		// }
		// catch (err) {
		// 	throw new Error(`${err.message}\nin ${this.url}`);
		// }
	}

	get_Entries() {
		return [];
	}

	get_InputTypes() {
		return new Types();
	}

	summary() {
		const inputs = [];
		for (let key in this.inputs) {
			inputs.push(`${typeToString(this.inputs[key].datatype)} ${key} = ${this.inputs[key].default} uid: ${this.inputs[key].uid}`)
		}
		const outputs = [];
		for (let key in this.outputs) {
			outputs.push(`${typeToString(this.outputs[key].datatype)} ${key} uid: ${this.outputs[key].uid}`)
		}
		const type = [];
		for (let item of this.type.to_List()) {
			type.push(item);
		}
		return `>| component_${this.uid.toString()} url: ${this.url}
>| inputs:${inputs.map(i => `\n * ${i}`).join("")}
>| outputs:${outputs.map(i => `\n * ${i}`).join("")}
>| type:${type.map(i => `\n * ${i}`).join("")}`;
	}
}

// SDML Compiler
class SDML_Compile_Error extends Error {
	constructor(msg) {
		super(msg);
		this.name = "SDML_Compile_Error";
	}
}

class SDML_Compile_Warning extends Error {
	constructor(msg) {
		super(msg);
		this.name = "SDML_Compile_Warning";
	}
}

class DepGraphError {
	constructor(msg, map) {
		this.msg = msg;
		this.map = new DepGraph(map).to_Mermaid();
	}

	toString() {
		return this.to_String();
	}

	get graph() {
		return this.map;
	}

	to_String() {
		return `Graph Error: ${this.msg}\nMermaid Code:\n${this.map}`;
	}
}

class DepGraph {
	constructor(map) {
		this.edges = map ?? new Map();
	}

	add_Node(node) {
		if (!this.edges.has(node))
			this.edges.set(node, new Set());
	}

	add_Edge(from, to) {
		this.add_Node(from);
		this.add_Node(to);
		const edge = this.edges.get(to);
		edge.add(from);
	}

	get_TopologicalOrder() {
		const order = [];
		let flag = false;
		const edges = new Map(this.edges);
		edges.forEach((val, key, map) => {
			map.set(key, new Set(val));
		})
		while (edges.size > 0) {
			flag = false;
			const entry = [...edges.entries()];
			entry.forEach(([key, val]) => {
				if (val.size === 0) {
					order.push(key);
					edges.delete(key);
					edges.forEach(val => val.delete(key));
					flag = true;
				}
			})
			if (!flag)
				break;
		}
		if (edges.size > 0) throw new DepGraphError('fail to sort graph into topological order, one or more circlar references may exist', edges);
		return order;
	}

	to_Mermaid(title = 'graph LR') {
		/**
		graph LR
			A[Christmas] -->|Get money| B(Go shopping)
					B --> C{Let me think}
			C -->|One| D[Laptop]
			C -->|Two| E[iPhone]
			C -->|Three| F[fa:fa-car Car]
				*/
		const links = [...this.edges.entries()].map(([key, val]) => {
			if (val.size === 0) return [`${key.toGraphNode()}`]
			return [...val.entries()].map(([val]) => `${val.toGraphNode()} --> ${key.toGraphNode()}`)
		}).flat(1);
		return `${title}\n${links.join("\n")}`;
	}

}

function check_Params(params, params_templates) {
	// console.log(">>> check types!!", params, params_templates);
	const params_names = new Set(Object.keys(params));
	for (const key in params_templates) {
		if (!params_names.has(key)) return false;
		if (!params[key].match_Types(params_templates[key], true)) return false;
		params_names.delete(key);
	}
	if (params_names.size > 0) return false;
	return true;
}

function get_ParamsString(params, arr) {
	// debugger
	const ans = [];
	for (const param_name in params) {
		if (param_name === 'default') {
			if (params.default.is_Empty()) ans.push("(empty)");
			else
				ans.push(...params.default.to_List());
		}
		else {
			ans.push(`<${param_name}>`);
			if (params[param_name].is_Empty()) ans.push("\t(empty)");
			else
				ans.push(...params[param_name].to_List().map(i => `\t${i}`));
			ans.push(`</${param_name}>`);
		}
	}
	return arr ? ans : ans.join("\n");
}

class Types {
	constructor(types = null) {
		this.types = types === null ? null : { ...types };
	}

	to_Map() {
		return this.is_Empty() ? new Map() : new Map(Object.entries(this.types));
	}

	is_Empty() {
		return this.types === null;
	}

	clone() {
		return new Types(this.types);
	}

	merge_Types(types) {
		if (types.is_Empty()) return this.clone();
		const _a = new Types(this.is_Empty() ? {} : this.types);
		for (let type in types.types) {
			_a.types[type] = (_a.types[type] ?? 0) + types.types[type];
		}
		return _a;
		// return new Types(merge_Types(this.types, types.types));
	}

	merge_TypesLocal(types) {
		if (types.is_Empty()) return;
		this.types = this.is_Empty() ? {} : { ...this.types };
		const _a = this.types;
		for (let type in types.types) {
			_a[type] = (_a[type] ?? 0) + types.types[type];
		}
		return _a;
	}

	match_Types(types, inf = false) {
		if (this.is_Empty() || types.is_Empty()) return this.types === types.types;
		const map = this.to_Map();
		for (let key in types.types) {
			const count_a = types.types[key];
			if (!map.has(key)) return false;
			const count_b = map.get(key);
			if (inf && count_a === Infinity);
			else if (count_a !== count_b) return false;
			map.delete(key);
		}
		if (map.size > 0) return false;
		return true;
	}

	make_Infinity() {
		if (this.is_Empty()) return this;
		for (let type in this.types) {
			this.types[type] = Infinity;
		}
		return this;
	}

	get type_names() {
		if (this.is_Empty()) return [];
		return Object.keys(this.types);
	}

	to_String() {
		return this.toString();
	}

	toString() {
		return this.to_List().join(', ');
	}

	to_List() {
		if (this.is_Empty()) return ['(empty)'];
		return Object.entries(this.types).map(([type, count]) => `${type} * ${count}`);
	}

	static NONE = null;
	static IGNORE = Symbol("ignore all types");
}

class Collection {
	constructor() {
		this.collection = {};
	};

	add_Class(match_type) {
		if (match_type in this.collection) return this.collection[match_type];
		else {
			const match_obj = {};
			this.collection[match_type] = match_obj;
			return match_obj;
		}
	}

	add(match_type, type, node) {
		const match_obj = this.add_Class(match_type);
		if (type in match_obj) match_obj[type].add(node);
		else {
			const set = new Set();
			set.add(node);
			match_obj[type] = set;
		}
	}

	get(param) {
		return this.collection[param];
	}

	get_All(param) {
		const _class = this.get(param);
		const arr = [];
		for (const key in _class) {
			arr.push(..._class[key]);
		}
		return [...new Set(arr)];
	}

	get_Class(param, typename) {
		return [...(this.collection?.[param]?.[typename] ?? [])];
	}

	merge_Local(collection) {
		// debugger
		for (const param in collection.collection) {
			if (param in this.collection) {
				const types = collection.collection[param];
				for (const type in types) {
					const nodes = types[type];
					for (const node of nodes) {
						if (!this.collection[param][type].includes(node)) this.collection[param][type].push(node);
					}
				}
			}
			else {
				this.collection[param] = collection.collection[param];
			}
		}
	}

	get_AllChildren(param) {
		if (this.collection[param] === undefined) return;
		let array = [];
		for (let set in this.collection[param]) {
			array = [...array, ...this.collection[param][set]];
		}
		return array;
	}
}

class SDML_Compile_Scope {
	constructor(env, urlmap, template, inputs, outputs, slots, parent = null, opt) {
		this.env = env;
		this.urlmap = urlmap;
		this.nodemap = {};
		this.template = template;
		this.opt = opt;
		this.inputs = inputs ?? {};
		this.outputs = outputs ?? {};
		this.slots = slots ?? {};
		this.parent = parent;
		this.graph = new DepGraph();
		this.types = null;
		this.collection = null;
		this.inputs_type = this.get_InputsTypes();
		this.nodes_type = {};
		this.compile();
	}

	new_Scope(template, parent = this) {
		const scope = new SDML_Compile_Scope(this.env, this.urlmap, template, this.inputs, this.outputs, this.slots, parent, this.opt);
		return scope;
	}

	register_Node(id, node) {
		if (id === undefined) id = `$node_${this.env.uid}`;
		if (id in this.nodemap) {
			throw new SDML_Compile_Error(`dupicate id ${id} found`);
		}
		this.nodemap[id] = node;
		this.graph.add_Node(node);
	}

	check_Valid(nodename) {
		if (nodename in ALL_NODE_TYPES) {
			return true;
		}
		if (nodename in this.urlmap) {
			return true
		}
		return false;
	}

	get_TartgetInputs(nodename) {
		if (nodename in ALL_NODE_TYPES) {
			return ALL_NODE_TYPES[nodename].inputs;
		}
		if (nodename in this.urlmap) {
			const node = this.env.get(this.urlmap[nodename]);
			return node.get_InputTypes();
		}
	}

	get_TargetEntries(nodename) {
		if (nodename in ALL_NODE_TYPES) {
			return ALL_NODE_TYPES[nodename].entries;
		}
		if (nodename in this.urlmap) {
			const node = this.env.get(this.urlmap[nodename]);
			return node.get_Entries();
		}
	}

	get_NodeInstance(id, tagName, parent = null, ast) {
		if (tagName in ALL_NODE_TYPES) {
			return new ALL_NODE_TYPES[tagName](this, tagName, id, parent, ast);
		}
		if (tagName in this.urlmap) {
			const component = this.env.get(this.urlmap[tagName]);
			// console.log(component);
			return new SDML_Compiler_Visitor(this, tagName, id, parent, ast);
		}
	}
	/**
	 * walk method
	 * 1. recersive walk down
	 * 
	 */

	walk(nodes = [], param = 'default', parent = null) {
		const types = new Types();
		const collection = new Collection();
		for (const n of nodes) {
			const name = n.tagName;
			const { id = `$node_${this.env.uid}` } = n.attributes;
			// check valid
			if (!this.check_Valid(name)) {
				throw new SDML_Compile_Error(`<${name}/> is not a valid nodes that can be found in base-nodes or ref-nodes`);
			}
			// get desire type and all entries
			const target_inputs = this.get_TartgetInputs(name);
			const target_entries = this.get_TargetEntries(name);
			// console.log(`${name} id:${id}`, ">>>> require", target_inputs, target_entries);
			// check types
			// if target_types is null
			if (target_inputs === Types.NONE) {
				if (n.children.length > 0) {
					throw new SDML_Compile_Error(`<${name}/> should not have any sub nodes:\n<${name}>${n.children.map(i => `\n\t<${i.tagName}>...</${i.tagName}>`).join("")}\n</${name}>`);
				}
				else {
					const child = this.get_NodeInstance(id, name, parent, n);
					this.register_Node(id, child);
					child.add_ToCollection(collection, param);
					types.merge_TypesLocal(child.get_Type());
				}
			}
			else if (target_inputs === Types.IGNORE) {
				const child = this.get_NodeInstance(id, name, parent, n);
				this.register_Node(id, child);
				child.add_ToCollection(collection, param);
				types.merge_TypesLocal(child.get_Type());
			}
			else {
				// collect params
				const params = { default: [] };
				target_entries.forEach(e => { params[e] = [] });
				function set_params(name, subs) {
					params[name].push(...subs);
				}
				// console.log(n)
				for (const child of n.children) {
					const child_name = child.tagName;
					const valid = this.check_Valid(child_name);
					const is_entry = target_entries.includes(child_name);
					let { param } = child.attributes;
					param = param !== undefined;
					if (valid && is_entry) {
						if (param) set_params(child_name, child.children);
						else {
							throw new SDML_Compile_Error(`<${child_name}/> is ambiguous which can be resolved either a node or and a parameter label in:\n<${name}>\n\t<${child_name}/>\n</${name}>\nyou can use a 'param' flag to specify it's purpose like: <${child_name} param/>`)
						}
					}
					else if (is_entry) {
						set_params(child_name, child.children);
					}
					else {
						set_params('default', [child]);
					}
				}
				const children_collection = new Collection();
				const children_types = {};
				for (const key in params) {
					const nodes = params[key];
					const { types: sub_type, collection: sub_collection } = this.walk(nodes, key, n);
					children_collection.merge_Local(sub_collection);
					children_types[key] = sub_type;
				}
				// console.log(children_types, children_collection, target_inputs);
				// check types
				let match_params = null;
				for (const template_name in target_inputs) {
					const template = { ...target_inputs[template_name] };
					for (const template_name of target_entries) {
						if (!(template_name in template)) template[template_name] = new Types();
					}
					const matched = check_Params(children_types, template);
					// console.log(template_name, matched);
					if (matched) {
						match_params = template_name;
						break;
					}
				}
				if (match_params === null) {
					const expect_types = [];
					let i = 1;
					for (const types in target_inputs) {
						expect_types.push(`${i}. ${types}:\n< >\n${get_ParamsString(target_inputs[types], true).map(i => `\t${i}`).join("\n")}\n</>`);
						i++;
					}
					throw new SDML_Compile_Error(`type check fail in <${name}/>\ncurrent sub types:\n<${name}>\n${get_ParamsString(children_types, true).map(i => `\t${i}`).join("\n")}\n<${name}/>\nexpect sub types:\n${expect_types.join("\n")}`);
				}
				// console.log(">>>>> match", match_params);
				const child = this.get_NodeInstance(id, name, parent, n);
				this.register_Node(id, child);
				child.receive_Sub(children_types, children_collection, match_params);
				child.add_ToCollection(collection, param);
				types.merge_TypesLocal(child.get_Type());
				// const { types: sub_type, collection: sub_collection } = this.walk(n.children, undefined, n);
				// const [ans, match_type] = sub_type.check_Types(target_inputs);
				// if (!ans) {
				// 	throw new SDML_Compile_Error(`type check fail in <${name}/>\ncurrent sub types:\n<${name}>\n${sub_type.to_List().map(i => `\t${i}`).join("\n")}\n<${name}/>\nexpect sub types:`)
				// }
				// else {
				// 	const child = this.get_NodeInstance(id, name, parent, n);
				// 	this.register_Node(id, child);
				// 	child.receive_Sub(sub_type, sub_collection, match_type);
				// 	child.add_ToCollection(collection, param);
				// 	types.merge_TypesLocal(child.get_Type());
				// }
			}
		}
		return { types, collection };
	}

	get_InputsTypes() {
		const inputs = {};
		for (const key in this.inputs) {
			inputs[key] = this.inputs[key].datatype;
		}
		return inputs;
	}

	get_NodesTypes() {
		const nodes = {};
		for (const key in this.nodemap) {
			const node = this.nodemap[key];
			nodes[key] = node.get_Exports();
		}
		return nodes;
	}

	parse() {
		for (const key in this.nodemap) {
			const node = this.nodemap[key];
			node.parse();
			node.noderefs.forEach(id => {
				this.graph.add_Edge(this.nodemap[id], node);
			})
		}
	}

	compile() {
		// console.log("compile!!!");
		const { types, collection } = this.walk(this.template);
		this.types = types;
		this.collection = collection;
		this.nodes_type = this.get_NodesTypes();
		this.parse();
		try {
			console.warn(types, collection, this.graph.get_TopologicalOrder());
			// render_Graph(this.graph.to_Mermaid()).then(svg => {
			// 	console.log(`Graph Preview:\n\t%c %c`, `border: black 1px solid; background: url("data:image/svg+xml;base64,${btoa(svg)}") no-repeat center; padding: 180px 180px; background-size: contain;`, "");
			// })
		}
		catch (err) {
			render_Graph(err.graph).then(svg => {
				console.log(`${err.to_String()}\nGraph Preview:\n\t%c %c`, `border: black 1px solid; background: url("data:image/svg+xml;base64,${btoa(svg)}") no-repeat center; padding: 180px 180px; background-size: contain;`, "");
			})
			// console.log(err.to_String());
		}
		return { types, collection };
		// console.log(this.graph.to_Mermaid());
	}

	to_Mermaid() {
		const [nodes, links] = this.$to_Mermaid();
		return `graph LR\n${nodes}\n${links.join("\n")}`;
	}

	$to_Mermaid(ans = [], link = []) {
		for (const key in this.nodemap) {
			const node = this.nodemap[key];
			node.to_Mermaid(ans, link);
		}
		return [`${ans.join('\n')}`, link];
	}
}

/**
 * Inputs Rules
 * 1. default: {a:1, b:2,...}
 * 2. param: name: {param1:{a:Inf}, param2:{b:Inf}}
 * {param.....}
 * {} means accept all
 * null means no children
 * undefined means cannot be resolve earlier
 */
class SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		this.scope = scope;
		this.name = name;
		this.id = id;
		this.uid = this.scope.env.uid;
		this.parent = parent;
		this.deps = new Set();
		this.noderefs = new Set();
	}

	static entries = [];
	static inputs = {};

	compile() {
		console.log(this);
	}

	toGraphNode() {
		return `Node${this.uid}(${this.name} id=${this.id})`;
	}

	toString() {
		return `${this.name}_${this.id}`;
	}

	to_String(subs = []) {
		return `<${this.name}>\n${subs.map(s => '\t' + s).join('\n')}\n</${this.name}>`;
	}

	to_Mermaid(ans) {
		return `Node_${this.id}`;
	}

	receive_Sub(types, collection, match_type) {

	}

	add_ToCollection(collection, param) {

	}

	parse() {
		// console.log(">> parse", this)
	}

	get_Type() {
		return SDML_Compiler_Visitor.type;
	}

	get_Exports() {
		return {
			test: {
				type: 'datatype',
				datatype: 'base',
				value: 'vec2'
			}
		};
	}

	add_Deps(set) {
		set.forEach(i => this.deps.add(i));
	}

	add_NodeRefs(set) {
		set.forEach(i => this.noderefs.add(i));
	}

	static get type() {
		return Types.NONE;
	}
}

class SDML_GeoTest extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.matched = null;
		this.subs = [];
	}

	static entries = ['from', 'to'];
	static inputs = {
		none: {
			default: new Types(null)
		},
		main: {
			default: new Types({
				vec2: Infinity
			})
		},
		both: {
			default: new Types({
				vec2: Infinity,
				geometry: Infinity,
			})
		},
		fromto: {
			default: new Types(),
			from: new Types({ vec2: 1 }),
			to: new Types({ vec2: 1 }),
		}
	};

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(geo id=${this.id} match=${this.matched})`);
		if (this.matched === 'main')
			for (const sub of this.subs) {
				link.push(`Node_${sub.uid} -->|vec2| Node_${this.uid}`);
			}
		if (this.matched === 'both') {
			for (const sub of this.subs[0]) {
				link.push(`Node_${sub.uid} -->|geometry| Node_${this.uid}`);
			}
			for (const sub of this.subs[1]) {
				link.push(`Node_${sub.uid} -->|vec2| Node_${this.uid}`);
			}
		}
		if (this.matched === 'fromto') {
			for (const sub of this.subs[0]) {
				link.push(`Node_${sub.uid} -->|from:vec2| Node_${this.uid}`);
			}
			for (const sub of this.subs[1]) {
				link.push(`Node_${sub.uid} -->|to:vec2| Node_${this.uid}`);
			}
		}
	}

	receive_Sub(types, collection, match_type) {
		console.log(types, collection, match_type)
		this.matched = match_type;
		switch (match_type) {
			case 'none': { break; }
			case 'main': {
				const defaults = collection.get_All('default');
				this.subs = defaults;
				for (const node of defaults) {
					this.scope.graph.add_Edge(node, this);
				}
				break;
			}
			case 'main': {
				const defaults = collection.get_All('default');
				this.subs = defaults;
				for (const node of defaults) {
					this.scope.graph.add_Edge(node, this);
				}
				break;
			}
			case 'both': {
				const geometrys = collection.get_Class('default', 'geometry');
				const vec2s = collection.get_All('default', 'vec2');
				this.subs = [geometrys, vec2s];
				for (const node of [...geometrys, ...vec2s]) {
					this.scope.graph.add_Edge(node, this);
				}
				break;
			}
			case 'fromto': {
				const geometrys = collection.get_Class('from', 'vec2');
				const vec2s = collection.get_All('to', 'vec2');
				this.subs = [geometrys, vec2s];
				for (const node of [...geometrys, ...vec2s]) {
					this.scope.graph.add_Edge(node, this);
				}
				break;
			}
		}
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'geometry', this);
	}

	get_Type() {
		return SDML_GeoTest.type;
	}

	static get type() {
		return new Types({ geometry: 1 });
	}
}

class SDML_Print extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
	}

	static inputs = Types.NONE;

	to_Mermaid(ans) {
		ans.push(`Node_${this.uid}(print id=${this.id})`);
	}

	receive_Sub(types, collection, match_type) {
	}

	add_ToCollection(collection, param) {
	}

	get_Type() {
		return SDML_Print.type;
	}

	static get type() {
		return new Types();
	}
}

class SDML_GeoTest2 extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
	}

	static inputs = Types.NONE;

	to_Mermaid(ans) {
		ans.push(`Node_${this.uid}(vec2 id=${this.id})`);
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'vec2', this);
	}

	get_Type() {
		return SDML_GeoTest2.type;
	}

	static get type() {
		return new Types({ vec2: 1 });
	}
}

class SDML_Both extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
	}

	static inputs = Types.NONE;

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(both id=${this.id})`);
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'vec2', this);
		collection.add(param, 'geometry', this);
	}

	get_Type() {
		return SDML_Both.type;
	}

	static get type() {
		return new Types({ vec2: 1, geometry: 1 });
	}
}

class SDML_If extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.test_ast = ast.attributes.test;
		let true_branch = [];
		let false_branch = [];
		ast.children.forEach(c => {
			if (c.tagName === 'else') false_branch = c.children;
			else true_branch.push(c);
		})
		this.true_scope = true_branch.length === 0 ? null : this.scope.new_Scope(true_branch);
		this.false_scope = false_branch.length === 0 ? null : this.scope.new_Scope(false_branch);
		if (this.false_scope === null) {
			if (this.true_scope === null) {
				throw new SDML_Compile_Error(`in node <if id="${this.id}"/> it does not has any sub nodes, you should always provide either default or <else param> sub nodes`);
			}
			this.types = this.true_scope.types.make_Infinity();
		}
		else {
			if (this.true_scope === null) {
				this.types = this.false_scope.types.make_Infinity();
			}
			else {
				const true_types = this.true_scope.types;
				const false_types = this.false_scope.types;
				if (true_types.match_Types(false_types)) {
					this.types = true_types;
				}
				else {
					this.types = true_types.merge_Types(false_types).make_Infinity();
				}
			}
			// else if (true_types.match_TypesNames(false_types)) {
			// 	this.types = true_types.make_Infinity();
			// }
			// else {
			// 	console.log(true_types, false_types);
			// 	throw new SDML_Compile_Error(`in node <if id="${this.id}"/> the types of the true branch is not the same as the false branch:\nthe true branch types is:\n${true_types.to_List().map(i => `\t${i}`).join('\n')}\nthe false branch types is:\n${false_types.to_List().map(i => `\t${i}`).join('\n')}`);
			// }
		}
		// console.log(this.types);
	}

	static entries = [];
	static inputs = Types.IGNORE;

	to_Mermaid(ans, link) {
		let str = `subgraph Scope_${this.uid}`;
		str += `\nNode_${this.uid}(if id=${this.id})`;
		if (this.true_scope) {
			const [nodes, links] = this.true_scope.$to_Mermaid([], link);
			str += `\nsubgraph If_${this.uid}_true\n${nodes}\nend\nstyle If_${this.uid}_true fill:#dbf8db`;
			for (const node of this.true_scope.collection.get_All('default')) {
				links.push(`Node_${node.uid} --> Node_${this.uid}`);
			}
		}
		if (this.false_scope) {
			const [nodes, links] = this.false_scope.$to_Mermaid([], link);
			str += `\nsubgraph If_${this.uid}_false\n${nodes}\nend\nstyle If_${this.uid}_false fill:#f8dedb`;
			for (const node of this.false_scope.collection.get_All('default')) {
				links.push(`Node_${node.uid} --> Node_${this.uid}`);
			}
		}
		ans.push(`${str}\nend`);
	}

	add_ToCollection(collection, param) {
		this.types.type_names.forEach(type => {
			collection.add(param, type, this)
		})
	}

	parse() {
		if (this.test_ast === undefined) {
			throw new SDML_Compile_Error(`required parameter 'test' missing in node <if/>\nyou should use <if test="parameter"/> and the parameter should be type of bool`);
		}
		const [test_code, test_opt, test_err] = parse_Expression(this.test_ast, `${this.id}_param_test`, this.scope.inputs_type, this.scope.nodes_type);
		if (test_code === null) {
			throw new SDML_Compile_Error(`compiling parameter 'test' failed in <if test="${this.test_ast}"/>, here are the error messages from the expression compile sub-module:\n${test_err.join("\n\n")}`);
		}
		this.test_res = {
			code: test_code,
			opt: test_opt,
		}
		if (test_opt.constant) {
			throw new SDML_Compile_Warning(`compiling parameter 'test' warning in <if test="${this.test_ast}"/>\nexpression '${this.test_ast}' is an constant expression\nyou may want to replace the <if/> node with static ones`);
		}
		this.add_Deps(test_opt.deps);
		this.add_NodeRefs(test_opt.ids);
		// console.log(this);
	}

	get_Type() {
		return this.types.clone();
	}

	static get type() {
		return Types.NONE;
	}
}

class SDML_For extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.for_loop = this.scope.new_Scope(ast.children);
		this.types = null;
	}

	static entries = [];
	static inputs = Types.IGNORE;

	receive_Sub(types, collection, match_type) {
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'geometry', this);
		// this.types.type_names.forEach(type => {
		// })
	}

	get_Type() {
		return new Types();
	}

	static get type() {
		return Types.NONE;
	}
}

const ALL_NODE_TYPES = {
	'if': SDML_If,
	'for': SDML_For,
	'geo': SDML_GeoTest,
	'vec2': SDML_GeoTest2,
	'print': SDML_Print,
	'both': SDML_Both,
}