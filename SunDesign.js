import { typeCheck } from './sPARks.js';
import { SourceScript, SunDesignExpressionLexer, SunDesignExpressionParser, SunDesignExpressionTypeCheckPass, SunDesignExpressionOptimizationPass, SunDesignExpressionCodeGenPass, typeToString } from './SunDesignExpression.js';
import "./lib/mermaid.js";
import * as SDML_Templates from './SunDesignTagTemplates/templates.js';

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
const CODEGEN_INPUT_BASE = 'this.i';

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
		const [code, opt] = walker3.generate(astnew2, { INPUTS: CODEGEN_INPUT_BASE });
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
	constructor(loaders = {}, opt = {}) {
		this.opt = opt;
		this.uidgen = BigInt(0);
		this.urlmap = {};
		this.caches = {};
		this.promises = [];
		loaders = { component: ComponentWebLoader, ...loaders };
		this.loaders = {};
		this.used_templates = new Map();
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

	get_ClassName(name) {
		if (name in this.urlmap)
			return this.get(this.urlmap[name]).class_name;
		return undefined;
	}

	add_Template(name, code) {
		this.used_templates.set(name, code);
	}

	get uid() {
		return this.uidgen++;
	}

	generate() {
		const codes = [...this.used_templates.values()];
		return `${SDML_Templates.BASE}\n${codes.join('\n\n')}`;
	}
}

class SDML_Node {
	constructor(env) {
		this.type = {
			node: 1
		};
		this.env = env;
		this.uid = this.env.uid;
		this.class_name = `component_Component_${this.uid}`;
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

	get_InputsTypes() {
		return Types.NONE;
	}

	get_ExportsTypes() {
		return Types.NONE;
	}

	get_SDMLNodeInstance(scope, name, id, parent, ast) {
	}
}

const ALL_INPUTS_TYPES = {
	number: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.number)
	},
	int: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.int)
	},
	float: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.float)
	},
	bool: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.bool)
	},
	string: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.string)
	},
	vec2: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.vec2)
	},
	vec3: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.vec3)
	},
	euler: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.vec3)
	},
	mat4: {
		default: (val) => { return val },
		datatype: () => ExpTypes.base(ExpTypes.mat4)
	},
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
		this.types = null;
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
				const datatype = ALL_INPUTS_TYPES[type].datatype();
				if (defaultval === undefined) {
					this.inputs[name] = {
						uid: this.env.uid,
						datatype: datatype,
					}
				}
				else {
					const [code, opt, err] = parse_Constant(defaultval);
					if (err.length > 0) {
						throw new Error(`default value parse error in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nin ${this.url}:\n${err.join('\n\n')}`);
					}
					if (!opt.constant) {
						throw new Error(`default value is not constant in\n<inputs>\n\t<${type} name="${name}"/>\n</inputs>\nin ${this.url}`);
					}
					if (!typeCheck(datatype, opt.datatype)) {
						throw new Error(`default value is type of ${typeToString(opt.datatype)}, not type of ${type} in\n<inputs>\n\t<${type} name="${name}" default="${defaultval}"/>\n</inputs>\nin ${this.url}`);
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
			const { name, value } = i.attributes;
			if (name === undefined) {
				throw new Error(`output does not have a name in\n<outputs>\n\t<${type}/>\n</outputs>\nin ${this.url}`);
			}
			if (value === undefined) {
				throw new Error(`output does not have a value expression in\n<outputs>\n\t<${type} name="${name}"/>\n</outputs>\nin ${this.url}`);
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
						str: value,
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
				const slot = new Types();
				for (let t of i.children) {
					const type = t.tagName;
					const { count } = t.attributes;
					if (count === undefined) {
						slot.merge_TypesLocal(new Types({ [type]: Infinity }));
					}
					else if (test_Number(count)) {
						slot.merge_TypesLocal(new Types({ [type]: parseInt(count) }));
					}
					else {
						throw new Error(`slot's type's count '${count}' in\n<slots>\n\t<${name}>\n\t\t<${type} count="${count}"/>\n\t</${name}></slots>\nis invalid in ${this.url}`)
					}
				}
				this.slots[name] = { types: slot };
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
					cut_type = subcom.types.clone();
				}
				else {
					throw new Error(`type of node <${name}/> can not but directly resolved in\n<template>\n\t<${name}/>\n</template>\nin ${this.url}\nyou may want to use <type/> entry to define component's type explicitly`);
				}
				type.merge_TypesLocal(cut_type);
			}
			this.types = type;
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
			this.types = type;
		}
		try {
			this.compile_res = new SDML_Compile_Scope(this.env, this.urlmap, this.xmlast.template, this.inputs, this.outputs, this.slots, null, {});
			if (!this.types.match_Types(this.compile_res.types, false, true)) {
				throw new Error(`types do not match:\nthe desired types are:\n${this.types.to_List().map(i => `* ${i}`).join("\n")}\nbut the compiled results are:\n${this.compile_res.types.to_List().map(i => `* ${i}`).join("\n")}`);
			}
			this.types = this.compile_res.types;
			const mermaid = this.compile_res.to_Mermaid();
			render_Graph(mermaid).then(svg => {
				console.log(`Graph Preview: ${this.url}\n\t%c %c`, `border: black 1px solid; background: url("data:image/svg+xml;base64,${btoa(svg)}") no-repeat center; padding: 180px 280px; background-size: contain;`, "");
			})
			const codegen = new SDML_Compile_CodeGen(this.env, this.class_name, this.compile_res, this.env.opt);
			const code = codegen.generate();
			this.env.add_Template(this.class_name, code);
		}
		catch (err) {
			console.log(err)
			throw new Error(`${err.message}\nin ${this.url}`);
		}
	}

	get_Entries() {
		return Object.keys(this.slots);
	}

	get_InputsTypes() {
		const slots = {};
		for (const slot in this.slots) {
			slots[slot] = this.slots[slot].types;
		}
		return {
			default: {
				default: new Types(),
				...slots
			}
		};
	}

	get_ExportsTypes() {
		const map = {};
		for (const name in this.outputs) {
			map[name] = this.outputs[name].datatype;
		}
		return map;
	}

	get_SDMLNodeInstance(scope, name, id, parent, ast) {
		return new SDML_ComponentNode(scope, name, id, parent, ast, this);
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
		for (let item of this.types.to_List()) {
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

function check_Params(params, params_templates, type_maps = []) {
	// console.log(">>> check types!!", params, params_templates);
	const params_names = new Set(Object.keys(params));
	for (const key in params_templates) {
		if (!params_names.has(key)) return false;
		const extends_map = [];
		if (!params[key].match_Types(params_templates[key], true, undefined, extends_map)) return false;
		params_names.delete(key);
		type_maps.push({ param: key, extends_map: extends_map });
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

class TypesManager {
	constructor() {
		this.map = {};
	}

	extends(base = null, type, params) {
		this.map[type] = {
			name: type,
			parent: base === null ? null : (this.map[base] ?? null),
			params: params
		};
	}

	instance_of(a, b) {
		if (a in this.map && b in this.map) {
			let cnt = a;
			while (true) {
				if (a === null) return false;
				if (a === b) return true;
				a = this.map[a].parent?.name ?? null;
			}
		}
		return false;
	}
}

const TypesManagerSingleton = new TypesManager();

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

	match_Types(types, inf = false, ext = false, extends_map = []) {
		if (types.is_Empty()) return this.types === types.types;
		if (this.is_Empty()) {
			for (let key in types.types) {
				const count_a = types.types[key];
				if (count_a !== Infinity) return false;
			}
			return true;
		}
		else {
			const map = this.to_Map();
			const keys = [...map.keys()];
			for (let key in types.types) {
				const mapped_keys = keys.map(t => {
					return t === key || TypesManagerSingleton.instance_of(t, key);
				});
				const passeed = mapped_keys.reduce((last, cnt) => last && cnt, true);
				const count_b = mapped_keys.reduce((last, cnt, idx) => {
					if (cnt) last += map.get(keys[idx]);
					return last;
				}, 0);
				const count_a = types.types[key];
				// console.log(passeed, count_b);
				if (!passeed/*!map.has(key)*/) {
					if (inf && count_a === Infinity);
					else
						return false
				};
				// const count_b = map.get(key);
				if (inf && count_a === Infinity);
				else if (count_a !== count_b) return false;
				extends_map.push({ target: key, subtypes: keys.filter((t, idx) => mapped_keys[idx]) });
				mapped_keys.forEach((i, idx) => {
					const map_key = keys[idx];
					if (i) map.delete(map_key);
				})
				// map.delete(key);
			}
			if (ext && map.size > 0) return false;
			return true;
		}

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

	get slots_name() {
		return Object.keys(this.collection);
	}

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

class ExpTypes {
	static int = 'int';
	static float = 'float';
	static bool = 'bool';
	static string = 'string';
	static vec2 = 'vec2';
	static vec3 = 'vec3';
	static mat4 = 'mat4';
	static euler = 'euler';
	static any = '$any';
	static number = '$number';
	static base(type) {
		return {
			type: 'datatype',
			datatype: 'base',
			value: type
		}
	}
	static array(type, count = null) {
		return {
			type: "datatype",
			datatype: "arraytype",
			count: count,
			value: type
		}
	}
}

class SDML_Compile_Scope {
	constructor(env, urlmap, template, inputs, outputs, slots, parent = null, opt) {
		this.env = env;
		this.uid = env.uid;
		this.urlmap = urlmap;
		this.nodemap = {};
		this.template = template;
		this.opt = opt;
		this.inputs = inputs ?? {};
		this.outputs = outputs ?? {};
		this.slots = slots ?? {};
		for (const slot in this.slots) {
			this.slots[slot].used = false;
		}
		this.parent = parent;
		this.graph = new DepGraph();
		this.order = [];
		this.types = null;
		this.collection = null;
		this.inputs_type = this.get_InputsTypes();
		this.nodes_type = {};
		this.param_link = [];
		this.scope_deps = new Set();
		this.compile();
	}

	new_Scope(template, additional_inputs = {}, keep_slots = false, parent = this) {
		const scope = new SDML_Compile_Scope(this.env, this.urlmap, template, { ...this.inputs, ...additional_inputs }, null, keep_slots ? this.slots : {}, parent, this.opt);
		return scope;
	}

	registe_Node(id, node) {
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

	get_TartgetInputs(nodename, ast) {
		if (nodename in ALL_NODE_TYPES) {
			return ALL_NODE_TYPES[nodename].get_InputsTypes(ast) ?? ALL_NODE_TYPES[nodename].inputs;
		}
		if (nodename in this.urlmap) {
			const node = this.env.get(this.urlmap[nodename]);
			return node.get_InputsTypes();
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

	get_TargetExports(nodename, ast) {
		if (nodename in ALL_NODE_TYPES) {
			return ALL_NODE_TYPES[nodename].get_ExportsTypes(ast) ?? ALL_NODE_TYPES[nodename].exports;
		}
		if (nodename in this.urlmap) {
			const node = this.env.get(this.urlmap[nodename]);
			return node.get_ExportsTypes();
		}
	}

	get_NodeInstance(id, tagName, parent = null, ast) {
		if (tagName in ALL_NODE_TYPES) {
			return new ALL_NODE_TYPES[tagName](this, tagName, id, parent, ast);
		}
		if (tagName in this.urlmap) {
			const component = this.env.get(this.urlmap[tagName]);
			return component.get_SDMLNodeInstance(this, tagName, id, parent, ast);
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
				throw new SDML_Compile_Error(`<${name}/> is not a valid nodes that can be found in base-nodes or ref-nodes or slots instance`);
			}
			// get desire type and all entries
			const target_inputs = this.get_TartgetInputs(name, n);
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
					this.registe_Node(id, child);
					child.add_ToCollection(collection, param);
					types.merge_TypesLocal(child.get_Type());
				}
			}
			else if (target_inputs === Types.IGNORE) {
				const child = this.get_NodeInstance(id, name, parent, n);
				this.registe_Node(id, child);
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
					// debugger
					const { types: sub_type, collection: sub_collection } = this.walk(nodes, key, n);
					children_collection.merge_Local(sub_collection);
					children_types[key] = sub_type;
				}
				// console.log(children_types, children_collection, target_inputs);
				// check types
				let match_params = null;
				let type_maps = [];
				for (const template_name in target_inputs) {
					const template = { ...target_inputs[template_name] };
					for (const template_name of target_entries) {
						if (!(template_name in template)) template[template_name] = new Types();
					}
					const _type_maps = [];
					const matched = check_Params(children_types, template, _type_maps);
					// console.log(template_name, matched);
					if (matched) {
						match_params = template_name;
						type_maps = _type_maps;
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

				const extends_collection = new Collection();
				for (const { param, extends_map } of type_maps) {
					const param_collection = children_collection.get(param);
					// console.log(param, extends_map, param_collection);
					for (const { target, subtypes } of extends_map) {
						for (const sub_type of subtypes) {
							param_collection[sub_type].forEach(n => {
								n.types_maps[sub_type] = target;
								extends_collection.add(param, target, n)
							})
						}
					}
				}

				// console.log(">>>>> match", match_params, extends_collection);
				const child = this.get_NodeInstance(id, name, parent, n);
				this.registe_Node(id, child);
				child.receive_Sub(children_types, extends_collection, match_params);
				child.add_ToCollection(collection, param);
				types.merge_TypesLocal(child.get_Type());
				// const { types: sub_type, collection: sub_collection } = this.walk(n.children, undefined, n);
				// const [ans, match_type] = sub_type.check_Types(target_inputs);
				// if (!ans) {
				// 	throw new SDML_Compile_Error(`type check fail in <${name}/>\ncurrent sub types:\n<${name}>\n${sub_type.to_List().map(i => `\t${i}`).join("\n")}\n<${name}/>\nexpect sub types:`)
				// }
				// else {
				// 	const child = this.get_NodeInstance(id, name, parent, n);
				// 	this.registe_Node(id, child);
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

	registe_NodeRefs(node, nodeset) {
		nodeset.forEach(id => {
			this.graph.add_Edge(this.nodemap[id], node);
			this.param_link.push(`Node_${this.nodemap[id].uid} --> |param| Node_${node.uid}`);
		})
	}

	registe_Deps(deps) {
		deps.forEach(i => {
			this.scope_deps.add(i);
		})
	}

	collect_Exports(ast) {
		for (const node of ast) {
			const vaild = this.check_Valid(node.tagName);
			if (vaild) {
				const { id } = node.attributes;
				if (id !== undefined) {
					if (!test_IdentifierName(id)) throw new SDML_Compile_Error(`id is not a valid identifier string in node <${node.tagName} id="${id}"/>`);
					this.nodes_type[id] = this.get_TargetExports(node.tagName, node) ?? {};
				}
			}
			this.collect_Exports(node.children);
		}
	}

	parse_Outputs() {
		if (this.outputs === null) return;
		for (const output in this.outputs) {
			const map = this.outputs[output];
			const [exp_code, exp_opt, exp_err] = parse_Expression(map.str, `${this.uis}_export_${output}`, this.inputs_type, this.nodes_type);
			if (exp_code === null) {
				throw new SDML_Compile_Error(`compiling output '${output}' failed in <output test="${map.str}"/>, here are the error messages from the expression compile sub-module:\n${exp_err.join("\n\n")}`);
			}
			else if (!typeCheck(map.datatype, exp_opt.datatype)) {
				throw new SDML_Compile_Error(`type-checking output '${output}' failed in <output test="${map.str}"/>, here are the current types:\nrequired: ${typeToString(map.datatype)}\nbut has: ${typeToString(exp_opt.datatype)}`);
			}
			else {
				map.code = exp_code;
				map.opt = exp_opt;
				this.registe_Deps(map.opt.deps);
			}
		}
	}

	compile() {
		this.collect_Exports(this.template);
		this.parse_Outputs();
		const { types, collection } = this.walk(this.template);
		this.types = types;
		this.collection = collection;
		for (const id in this.nodemap) {
			const node = this.nodemap[id];
			this.registe_NodeRefs(node, node.noderefs);
			this.registe_Deps(node.deps);
		}
		try {
			this.order = this.graph.get_TopologicalOrder();
		}
		catch (err) {
			// render_Graph(err.graph).then(svg => {
			// 	console.error(`${err.to_String()}\nGraph Preview:\n\t%c %c`, `border: black 1px solid; background: url("data:image/svg+xml;base64,${btoa(svg)}") no-repeat center; padding: 180px 180px; background-size: contain;`, "");
			// })
			throw new SDML_Compile_Error(`${err.msg}, the err graph is as followed:\n${err.map}`);
			console.log(err);
		}
		return { types, collection };
	}

	to_Mermaid() {
		const [nodes, links] = this.$to_Mermaid();
		return `graph LR\n${nodes}\n${[...links, ...this.param_link].join("\n")}`;
	}

	$to_Mermaid(ans = [], link = []) {
		const inputs = [];
		for (const input in this.inputs) {
			let flag = true;
			let _last = this;
			let cnt = this;
			while (true) {
				if (cnt === null) break;
				if (cnt.parent === null || !(input in cnt.parent.inputs));
				else {
					flag = false;
					if (cnt.parent === null) _last = cnt;
					else _last = cnt.parent;
					break;
				}
				cnt = cnt.parent;
			}
			if (flag)
				inputs.push(`Input_${input}_${_last.uid}((${input}))`);
		}
		for (const id in this.nodemap) {
			const node = this.nodemap[id];
			const deps = node.deps;
			deps.forEach(input => {
				let _last = this;
				let cnt = this;
				while (true) {
					// console.log(cnt, _last, input)
					if (cnt.parent === null) {
						_last = cnt;
						break;
					} else if (!(input in cnt.parent.inputs)) {
						break;
					}
					_last = cnt;
					cnt = cnt.parent;
				}
				link.push(`Input_${input}_${cnt.uid} --> |dep| Node_${node.uid}`)
			});
		}

		for (const slot in this.slots) {
			if (!this.parent || !(slot in this.parent.slots))
				inputs.push(`Slot_${slot}>${slot}]`)
		}
		for (const key in this.nodemap) {
			const node = this.nodemap[key];
			node.to_Mermaid(ans, link);
		}
		return [`${[...inputs, ...ans].join('\n')}`, link];
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
	constructor(scope, name, id, parent, ast, params) {
		this.scope = scope;
		this.name = name;
		this.id = id;
		this.uid = this.scope.env.uid;
		this.parent = parent;
		this.deps = new Set();
		this.noderefs = new Set();
		this.params = {};
		this.types_maps = {};
		if (params !== undefined)
			this.parse(params, ast);
	}

	static entries = [];
	// for inputs and exports you may use static get_InputsTypes / get_ExportsTypes for dynamic types with ast info
	static inputs = {};
	static exports = {};

	get_TypeMapped(type) {
		const ans = [];
		Object.entries(this.types_maps).forEach(([_type, target]) => {
			if (target === type)
				ans.push({
					node: this,
					type: _type
				})
		});
		return ans;
	}

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

	get_Type() {
		return SDML_Compiler_Visitor.type;
	}

	parse(params, ast) {
		const err = [];
		for (const param in params) {
			const { datatype, default: defaultval, hook, code } = params[param];
			let exp_str = ast.attributes[param];
			// required
			if (code) {
				if (exp_str === undefined) {
					this.params[params[param].alias ?? param] = {
						str: exp_str,
						code: code,
						opt: {
							ast: null,
							constant: true,
							datatype: datatype,
							deps: new Set(),
							ids: new Set()
						}
					}
					continue;
				}
			}
			if (defaultval === undefined) {
				if (exp_str === undefined) {
					err.push(`required parameter '${param}' missing in node <${this.name}/>\nyou should use <${this.name} ${param}="parameter"/> and the parameter should be type of ${typeToString(datatype)}`);
					continue;
				}
			}
			else {
				if (exp_str === undefined) exp_str = defaultval;
			}
			const [exp_code, exp_opt, exp_err] = parse_Expression(exp_str, `${this.id}_param_${param}`, this.scope.inputs_type, this.scope.nodes_type);
			if (exp_code === null) {
				err.push(`compiling parameter '${param}' failed in <${this.name} test="${exp_str}"/>, here are the error messages from the expression compile sub-module:\n${exp_err.join("\n\n")}`);
				continue;
			}
			else if (!typeCheck(datatype, exp_opt.datatype)) {
				err.push(`type-checking parameter '${param}' failed in <${this.name} ${param}="${exp_str}"/>, here are the current types:\nrequired: ${typeToString(datatype)}\nbut has: ${typeToString(exp_opt.datatype)}`);
				continue;
			}
			else {
				if (hook) hook(this, exp_str, exp_code, exp_opt);
				this.params[params[param].alias ?? param] = {
					str: exp_str,
					code: exp_code,
					opt: exp_opt,
				}
				this.add_Deps(exp_opt.deps);
				this.add_NodeRefs(exp_opt.ids);
			}
		}
		if (err.length > 0) {
			throw new SDML_Compile_Error(`when parsing node <${this.name}/> one or many expression errors occured as following:\n${err.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`);
		}
	}

	add_Deps(set) {
		set.forEach(i => this.deps.add(i));
	}

	add_NodeRefs(set) {
		set.forEach(i => this.noderefs.add(i));
	}

	// codegen
	generate(parent_codegen) {

	}

	get_NewNode(codegen) {
		return 'ComponentBase';
	}

	get_NodeChildren(codegen) {
		return {};
	}

	get_CustomChildrenParam(nodename, type) {
		return null;
	}

	get_CustomInit(nodename, type) {
		return null;
	}

	get_CustomInputs() {
		return {};
	}

	get_CustomUpdate(codegen, nodename) {
		return null;
	}

	get_CustomDispose(nodename) {
		return null;
	}

	get_ScopedInputs(codegen) {
		return [];
	}

	get_NodeSlots(codegen) {
		return {};
	}

	static get type() {
		return Types.NONE;
	}

	static get_ExportsTypes(ast) {
	}

	static get_InputsTypes(ast) {
	}
}

class SDML_If extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast, {
			test: {
				datatype: ExpTypes.base(ExpTypes.bool),
				alias: '$test'
			}
		});
		const carry_params = {};
		this.scoped_params = {};
		for (const param in ast.attributes) {
			if (/^param:[\_|a-zA-Z](\w)*$/.test(param)) {
				const param_name = param.split(':')[1];
				if (param_name in this.scope.inputs || param_name === this.iter || param_name === this.index) {
					throw new SDML_Compile_Error(`param '${param_name}' redefined in node <for id="${this.id}" param:${param_name}="..."/>`);
				}
				else {
					carry_params[param] = {
						datatype: ExpTypes.base(ExpTypes.any),
						alias: param_name,
					};
					this.scoped_params[param_name] = {
						uid: this.scope.env.uid,
						default: 'null',
						datatype: null
					}
				}
			}
		}
		this.parse(carry_params, ast);
		for (const param_name in this.scoped_params) {
			this.scoped_params[param_name].datatype = this.params[param_name].opt.datatype;
		}

		let true_branch = [];
		let false_branch = [];
		ast.children.forEach(c => {
			if (c.tagName === 'else') false_branch = c.children;
			else true_branch.push(c);
		})
		this.true_scope = true_branch.length === 0 ? null : this.scope.new_Scope(true_branch, { ...this.scoped_params }, true);
		this.false_scope = false_branch.length === 0 ? null : this.scope.new_Scope(false_branch, { ...this.scoped_params }, true);
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



		this.scope_deps = new Set([...(this.true_scope ? this.true_scope.scope_deps : []), ...(this.false_scope ? this.false_scope.scope_deps : [])]);
		for (const param_name in this.scoped_params) {
			this.scope_deps.delete(param_name);
		}
		this.deps = new Set([...this.deps, ...this.scope_deps]);
	}

	static entries = [];
	static inputs = Types.IGNORE;

	to_Mermaid(ans, link) {
		let str = `Node_${this.uid}(if id=${this.id})`;
		str += `\nsubgraph Scope_${this.uid}`;
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

	// codegen
	generate(parent_codegen) {
		const { if_branch_cache } = parent_codegen.opt;
		return if_branch_cache ? this.generate_Cache(parent_codegen) : this.generate_NoCache(parent_codegen);
	}

	generate_Cache(parent_codegen) {
		let code_true = null;
		let code_false = null;
		if (this.true_scope) {
			code_true = new SDML_Compile_CodeGen(parent_codegen.env, `closure_If_True_${this.uid}`, this.true_scope, parent_codegen.opt).generate();
			parent_codegen.env.add_Template(`closure_If_True_${this.uid}`, code_true);
		}
		if (this.false_scope) {
			code_false = new SDML_Compile_CodeGen(parent_codegen.env, `closure_If_False_${this.uid}`, this.false_scope, parent_codegen.opt).generate();
			parent_codegen.env.add_Template(`closure_If_False_${this.uid}`, code_false);
		}
		const types = this.types.type_names;
		const true_types = this.true_scope ? this.true_scope.types.type_names : [];
		const false_types = this.false_scope ? this.false_scope.types.type_names : [];

		const deps = [...this.scope_deps, ...Object.keys(this.scoped_params)];
		const bitmasks = new BitMask(['$test', ...deps]);
		const [[t_layer, t_mask]] = bitmasks.get_Masks(['$test']);
		// const d_bitmask = bitmasks.get_Masks([...deps]);

		const true_bitmask = bitmasks.get_Masks([...(this.true_scope?.scope_deps ?? [])]);
		const false_bitmask = bitmasks.get_Masks([...(this.false_scope?.scope_deps ?? [])]);

		const if_code = create_Component(
			// class_name
			`component_If_${this.uid}`,
			// default_inputs
			['$test: false', ...parent_codegen.get_DefaultInputs([...deps])],
			// bit masks
			bitmasks.mask_count,
			// nodes decl
			['this.condition = null;'],
			// params decl
			['this.true_nodes = null;',
				'this.false_nodes = null;'],
			// init
			['this.condition = this.i.$test;',
				`this.r = {n: {${types.map(i => `${i}: []`).join(', ')}}, e: {}};`,
				'if (this.condition) {',
				...(this.true_scope ? [
					`	const node = new closure_If_True_${this.uid}({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
					'	this.true_nodes = node;', ...true_types.map(t => {
						return `\tthis.r.n.${t}.push(...node.r.n.${t});`
					})] : []),
				'}',

				...(this.false_scope ? [
					'else {',
					`	const node = new closure_If_False_${this.uid}({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
					'	this.false_nodes = node;',
					...false_types.map(t => {
						return `\tthis.r.n.${t}.push(...node.r.n.${t});`
					}),
					'}'] : []),
			].filter(i => i !== undefined),
			// diff
			[
				`if (i.$test !== undefined && this.i.$test !== i.$test) {`,
				`	this.i.$test = i.$test;`,
				`	this.condition = i.$test;`,
				`	this.b[${t_layer}] |= ${t_mask};`,
				`}`, ...(
					[...deps].map(d => {
						const [[layer, mask]] = bitmasks.get_Masks([d]);
						return [`if (i.${d} !== undefined && i.${d} !== this.i.${d}) {`,
						`	this.i.${d} = i.${d};`,
						`	this.b[${layer}] |= ${mask};`,
							`}`];
					})
				).flat(1)],
			undefined,
			['if (this.true_nodes !== null) this.true_nodes.dispose();', 'if (this.false_nodes !== null) this.false_nodes.dispose();'],
			undefined,
			[`if (this.b[${t_layer}] & /* $test */ ${t_mask}) {`,
			...types.map(t => {
				return `	this.r.n.${t} = [];`
			}),
				`	if (this.condition) {`,
			...(this.true_scope ? [
				`		if (this.true_nodes !== null)`,
				`			this.true_nodes.update({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {})`,
				`		else `,
				`			this.true_nodes = new closure_If_True_${this.uid}({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				...true_types.map(t => {
					return `		this.r.n.${t}.push(...this.true_nodes.r.n.${t});`
				})] : []),
				`		return true;`,
				`	}`,
			...(this.false_scope ? [
				`	else {`,
				`		if (this.false_nodes !== null)`,
				`			this.false_nodes.update({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {})`,
				`		else `,
				`			this.false_nodes = new closure_If_False_${this.uid}({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				...false_types.map(t => {
					return `		this.r.n.${t}.push(...this.false_nodes.r.n.${t});`
				}),
				`		return true;`,
				`	}`] : []),
				`}`,

			...(true_bitmask.length === 0 ? [] : [
				`if (/* ${[...this.true_scope.scope_deps]} */ (${true_bitmask.map(([layer, mask]) => `this.b[${layer}] & ${mask}`).join(' || ')}) && this.condition) {`,
				...types.map(t => {
					return `	this.r.n.${t} = [];`
				}),
				`	const $changed = this.true_nodes.update({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				...true_types.map(t => {
					return `	this.r.n.${t}.push(...this.true_nodes.r.n.${t});`
				}),
				`	return $changed;`,
				`}`,
			]),

			...(false_bitmask.length === 0 ? [] : [
				`if (/* ${[...this.false_scope.scope_deps]} */ (${false_bitmask.map(([layer, mask]) => `this.b[${layer}] & ${mask}`).join(' || ')}) && !this.condition) {`,
				...types.map(t => {
					return `	this.r.n.${t} = [];`
				}),
				`	const $changed = this.false_nodes.update({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				...false_types.map(t => {
					return `	this.r.n.${t}.push(...this.false_nodes.r.n.${t});`
				}),
				`	return $changed;`,
				`}`,
			])
			]
		);
		// console.log(if_code)
		parent_codegen.env.add_Template(`component_If_${this.uid}`, if_code);
	}

	generate_NoCache(parent_codegen) {
		let code_true = null;
		let code_false = null;
		if (this.true_scope) {
			code_true = new SDML_Compile_CodeGen(parent_codegen.env, `closure_If_True_${this.uid}`, this.true_scope, parent_codegen.opt).generate();
			parent_codegen.env.add_Template(`closure_If_True_${this.uid}`, code_true);
		}
		if (this.false_scope) {
			code_false = new SDML_Compile_CodeGen(parent_codegen.env, `closure_If_False_${this.uid}`, this.false_scope, parent_codegen.opt).generate();
			parent_codegen.env.add_Template(`closure_If_False_${this.uid}`, code_false);
		}
		const types = this.types.type_names;
		const true_types = this.true_scope ? this.true_scope.types.type_names : [];
		const false_types = this.false_scope ? this.false_scope.types.type_names : [];

		const deps = [...this.scope_deps, ...Object.keys(this.scoped_params)];
		const bitmasks = new BitMask(['$test', ...deps]);
		const [[t_layer, t_mask]] = bitmasks.get_Masks(['$test']);
		// const d_bitmask = bitmasks.get_Masks([...deps]);

		const true_bitmask = bitmasks.get_Masks([...(this.true_scope?.scope_deps ?? [])]);
		const false_bitmask = bitmasks.get_Masks([...(this.false_scope?.scope_deps ?? [])]);

		const if_code = create_Component(
			// class_name
			`component_If_${this.uid}`,
			// default_inputs
			['$test: false', ...parent_codegen.get_DefaultInputs([...deps])],
			// bit masks
			bitmasks.mask_count,
			// nodes decl
			['this.condition = null;'],
			// params decl
			['this.if_nodes = null;'],
			// init
			['this.condition = this.i.$test;',
				`this.r = {n: {${types.map(i => `${i}: []`).join(', ')}}, e: {}};`,
				'if (this.condition) {',
				...(this.true_scope ? [
					`	const node = new closure_If_True_${this.uid}({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
					'	this.if_nodes = node;', ...true_types.map(t => {
						return `\tthis.r.n.${t}.push(...node.r.n.${t});`
					})] : []),
				'}',

				...(this.false_scope ? [
					'else {',
					`	const node = new closure_If_False_${this.uid}({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
					'	this.if_nodes = node;',
					...false_types.map(t => {
						return `\tthis.r.n.${t}.push(...node.r.n.${t});`
					}),
					'}'] : []),
			].filter(i => i !== undefined),
			// diff
			[
				`if (i.$test !== undefined && this.i.$test !== i.$test) {`,
				`	this.i.$test = i.$test;`,
				`	this.condition = i.$test;`,
				`	this.b[${t_layer}] |= ${t_mask};`,
				`}`, ...(
					[...deps].map(d => {
						const [[layer, mask]] = bitmasks.get_Masks([d]);
						return [`if (i.${d} !== undefined && i.${d} !== this.i.${d}) {`,
						`	this.i.${d} = i.${d};`,
						`	this.b[${layer}] |= ${mask};`,
							`}`];
					})
				).flat(1)],
			undefined,
			['if (this.if_nodes !== null) this.if_nodes.dispose();'],
			undefined,
			[`if (this.b[${t_layer}] & /* $test */ ${t_mask}) {`,
			...types.map(t => {
				return `	this.r.n.${t} = [];`
			}),
				`	if (this.if_nodes !== null) this.if_nodes.dispose();`,
				`	if (this.condition) {`,
			...(this.true_scope ? [
				`		const node = new closure_If_True_${this.uid}({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				`		this.if_nodes = node;`,
				...true_types.map(t => {
					return `		this.r.n.${t}.push(...node.r.n.${t});`
				})] : []),

				`	}`,
			...(this.false_scope ? [`	else {`,
				`		const node = new closure_If_False_${this.uid}({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				`		this.if_nodes = node;`,
				...false_types.map(t => {
					return `		this.r.n.${t}.push(...node.r.n.${t});`
				}),
				`	}`] : []),
				`	return true;`,
				`}`,

			...(true_bitmask.length === 0 ? [] : [
				`if (/* ${[...this.true_scope.scope_deps]} */ (${true_bitmask.map(([layer, mask]) => `this.b[${layer}] & ${mask}`).join(' || ')}) && this.condition) {`,
				...types.map(t => {
					return `	this.r.n.${t} = [];`
				}),
				`	const $changed = this.if_nodes.update({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				...true_types.map(t => {
					return `	this.r.n.${t}.push(...this.if_nodes.r.n.${t});`
				}),
				`	return $changed;`,
				`}`,
			]),

			...(false_bitmask.length === 0 ? [] : [
				`if (/* ${[...this.false_scope.scope_deps]} */ (${false_bitmask.map(([layer, mask]) => `this.b[${layer}] & ${mask}`).join(' || ')}) && !this.condition) {`,
				...types.map(t => {
					return `	this.r.n.${t} = [];`
				}),
				`	const $changed = this.if_nodes.update({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {});`,
				...false_types.map(t => {
					return `	this.r.n.${t}.push(...this.if_nodes.r.n.${t});`
				}),
				`	return $changed;`,
				`}`,
			])


				// ...(d_bitmask.length === 0 ? [] : [`if (/* ${[...deps]} */ ${d_bitmask.map(([layer, mask]) => `this.b[${layer}] & ${mask}`).join(' || ')}) {`,
				// ...types.map(t => {
				// 	return `	this.r.n.${t} = [];`
				// }),
				// 	`	let $changed = false;`,
				// 	`	if (this.condition) {`,
				// ...(this.true_scope ? [
				// 	`		$changed = this.if_nodes.update({${[...this.true_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {}) || $changed;`,
				// 	...true_types.map(t => {
				// 		return `		this.r.n.${t}.push(...this.if_nodes.r.n.${t});`
				// 	})] : []),
				// 	`	}`,
				// ...(this.false_scope ? [`	else {`,
				// 	`		$changed = this.if_nodes.update({${[...this.false_scope.scope_deps].map(i => `${i}: this.i.${i}`).join(', ')}}, {}, {}) || $changed;`,
				// 	...false_types.map(t => {
				// 		return `		this.r.n.${t}.push(...this.if_nodes.r.n.${t});`
				// 	}),
				// 	`	}`] : []),
				// 	`	return $changed;`,
				// 	`}`])
			]
		);
		// console.log(if_code)
		parent_codegen.env.add_Template(`component_If_${this.uid}`, if_code);
	}

	get_NewNode() {
		return `component_If_${this.uid}`;
	}

	get_CustomInputs() {
		const ans = {};
		const scope_deps = this.get_ScopedInputs();
		scope_deps.forEach(i => {
			ans[i] = {
				constant: true,
				code: `this.i.${i}`,
			}
		});
		return ans;
	}

	get_ScopedInputs(codegen) {
		const deps = this.scope_deps;
		return [...deps];
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
		super(scope, name, id, parent, ast, {
			array: {
				datatype: ExpTypes.array(ExpTypes.base(ExpTypes.any)),
				alias: '$array'
			}
		});
		if (ast.children.length === 0) {
			throw new SDML_Compile_Error(`in node <for id="${this.id}"/> it does not has any sub nodes, you should always provide sub nodes as the loop body`);
		}
		this.iter = ast.attributes.iter;
		this.index = ast.attributes.index;

		const carry_params = {};
		this.scoped_params = {};
		for (const param in ast.attributes) {
			if (/^param:[\_|a-zA-Z](\w)*$/.test(param)) {
				const param_name = param.split(':')[1];
				if (param_name in this.scope.inputs || param_name === this.iter || param_name === this.index) {
					throw new SDML_Compile_Error(`param '${param_name}' redefined in node <for id="${this.id}" param:${param_name}="..."/>`);
				}
				else {
					carry_params[param] = {
						datatype: ExpTypes.base(ExpTypes.any),
						alias: param_name,
					};
					this.scoped_params[param_name] = {
						uid: this.scope.env.uid,
						default: 'null',
						datatype: null
					}
				}
			}
		}
		this.parse(carry_params, ast);
		for (const param_name in this.scoped_params) {
			this.scoped_params[param_name].datatype = this.params[param_name].opt.datatype;
		}

		if (this.iter === undefined && this.index === undefined) {
			throw new SDML_Compile_Error(`in node <for id="${this.id}"/> it requires a 'iter' or 'index' parameter like: <for array="..." iter="parameter1" index="parameter2"/> where parameter is a valid identifier name`);
		}
		if (this.iter !== undefined) {
			if (!test_IdentifierName(this.iter))
				throw new SDML_Compile_Error(`iter name '${this.iter}' in node <for id="${this.id}" iter="${this.iter}"/> is invalid identifier name`);
			if (this.iter in this.scope.inputs || this.iter === this.index) {
				throw new SDML_Compile_Error(`iter redefined in node <for id="${this.id}" iter="${this.iter}"/>`);
			}
		}
		if (this.index !== undefined) {
			if (!test_IdentifierName(this.index))
				throw new SDML_Compile_Error(`index name '${this.index}' in node <for id="${this.id}" index="${this.index}"/> is invalid identifier name`);
			if (this.index in this.scope.inputs || this.iter === this.index) {
				throw new SDML_Compile_Error(`index redefined in node <for id="${this.id}" index="${this.index}"/>`);
			}
		}
		this.for_loop = this.scope.new_Scope(ast.children, {
			...(this.iter ? { [this.iter]: { uid: this.scope.env.uid, default: 'null', datatype: this.params.$array.opt.datatype.value } } : {}),
			...(this.index ? { [this.index]: { uid: this.scope.env.uid, default: 'null', datatype: ExpTypes.base(ExpTypes.int) } } : {}),
			...this.scoped_params,
		});
		this.types = this.for_loop.types.clone().make_Infinity();
		this.scope_deps = new Set([...this.for_loop.scope_deps]);
		if (this.iter)
			this.scope_deps.delete(this.iter);
		if (this.index)
			this.scope_deps.delete(this.index);
		for (const param_name in this.scoped_params) {
			this.scope_deps.delete(param_name);
		}
		this.deps = new Set([...this.deps, ...this.scope_deps]);
		// console.log(this.deps, this.scope_deps);
	}

	static entries = [];
	static inputs = Types.IGNORE;

	to_Mermaid(ans, link) {
		let str = `Node_${this.uid}(for id=${this.id})`;
		str += `\nsubgraph Scope_${this.uid}`;
		if (this.for_loop) {
			const [nodes, links] = this.for_loop.$to_Mermaid([], link);
			str += `\n${nodes}`;
			for (const node of this.for_loop.collection.get_All('default')) {
				links.push(`Node_${node.uid} --> Node_${this.uid}`);
			}
		}
		ans.push(`${str}\nend`);
	}

	receive_Sub(types, collection, match_type) {
	}

	add_ToCollection(collection, param) {
		this.types.type_names.forEach(type => {
			collection.add(param, type, this)
		})
	}

	generate(parent_codegen) {
		// console.log(this.for_loop);
		const { for_diff = true } = parent_codegen.opt;
		const codegen = new SDML_Compile_CodeGen(parent_codegen.env, `closure_For_${this.uid}`, this.for_loop, parent_codegen.opt);
		const code = codegen.generate();
		codegen.env.add_Template(`closure_For_${this.uid}`, code);
		const types = this.types.type_names;
		const deps = [...this.scope_deps, ...Object.keys(this.scoped_params)];
		const bitmasks = new BitMask(['$array', ...deps]);
		const [[a_layer, a_mask]] = bitmasks.get_Masks(['$array']);
		const d_bitmask = bitmasks.get_Masks([...deps]);
		const for_code = create_Component(
			// class_name
			`component_For_${this.uid}`,
			// default_inputs
			['$array:[]', ...parent_codegen.get_DefaultInputs([...deps])],
			// bit masks
			bitmasks.mask_count,
			// nodes decl
			['this.nodes_array = [];'],
			// params decl
			['this.array = null;'],
			// init
			['this.array = this.i.$array;', `this.r = {n: {${types.map(i => `${i}: []`).join(', ')}}, e: {}};`,
				'for (const [index, iter] of this.array.entries()) {',//...this.i
				`	const node = new closure_For_${this.uid}({${[...deps].map(d => `${d}: this.i.${d}, `).join('')}${[this.iter ? `${this.iter}: iter` : null, this.index ? `${this.index}: index` : null].filter(i => i !== null).join(', ')}}, {}, {});`,
				'	this.nodes_array.push(node);',
				...types.map(t => {
					return `\tthis.r.n.${t}.push(...node.r.n.${t});`
				}),
				'}'],
			// diff
			[
				`if (i.$array !== undefined && this.i.$array !== i.$array) {`,
				`	this.i.$array = i.$array;`,
				`	this.array = i.$array;`,
				`	this.b[${a_layer}] |= ${a_mask};`,
				`}`, ...(
					[...deps].map(d => {
						const [[layer, mask]] = bitmasks.get_Masks([d]);
						return [`if (i.${d} !== undefined && i.${d} !== this.i.${d}) {`,
						`	this.i.${d} = i.${d};`,
						`	this.b[${layer}] |= ${mask};`,
							`}`];
					})
				).flat(1)],
			undefined,
			['for (const node of this.nodes_array) {', '	node.dispose();', '}', 'this.nodes_array = [];'],
			[],
			!for_diff ? ['this.i = i;',
				'this.dispose();',
				'this.init(c, s);',
				'return true;',] :
				[
					`if (this.b[${a_layer}] & ${a_mask}) {`,
					`	const $len = this.array.length;`,
					`	let $changed = this.nodes_array.length !== $len;`,
					`	this.nodes_array.splice($len, Infinity).forEach(n => n.dispose());`,
					...types.map(t => {
						return `	this.r.n.${t} = [];`
					}),
					`	let $idx = 0;`,
					`	while ($idx < $len) {`,
					`		const iter = this.array[$idx];`,
					`		const index = $idx;`,
					`		const node = this.nodes_array[$idx];`,
					`		if (node === undefined) {`,
					`			$changed = true;`,
					`			const _node = new closure_For_${this.uid}({${[...deps].map(d => `${d}: this.i.${d}, `).join('')}${[this.iter ? `${this.iter}: iter` : null, this.index ? `${this.index}: index` : null].filter(i => i !== null).join(', ')}}, {}, {});`,
					`			this.nodes_array.push(_node);`,
					...types.map(t => {
						return `			this.r.n.${t}.push(..._node.r.n.${t});`
					}),
					`		}`,
					`		else {`,
					`			$changed = node.update({${[...deps].map(d => `${d}: this.i.${d}, `).join('')}${[this.iter ? `${this.iter}: iter` : null, this.index ? `${this.index}: index` : null].filter(i => i !== null).join(', ')}}, {}, {}) || $changed;`,
					...types.map(t => {
						return `			this.r.n.${t}.push(...node.r.n.${t});`
					}),
					`		}`,
					`		$idx++;`,
					`	}`,
					`	return $changed;`,
					`}`,
					...(d_bitmask.length === 0 ? [] : [`if (/* ${[...deps]} */ ${d_bitmask.map(([layer, mask]) => `this.b[${layer}] & ${mask}`).join(' || ')}) {`,
						`	const $len = this.array.length;`,
						`	let $changed = false;`,
					...types.map(t => {
						return `	this.r.n.${t} = [];`
					}),
						`	for (let $idx = 0; $idx < $len; $idx++) {`,
						`		const index = $idx;`,
						`		const node = this.nodes_array[$idx];`,
						`		const iter = this.array[$idx];`,
					`		$changed = node.update({${[...deps].map(d => `${d}: this.i.${d}, `).join('')}${[this.iter ? `${this.iter}: iter` : null, this.index ? `${this.index}: index` : null].filter(i => i !== null).join(', ')}}, {}, {}) || $changed;`,
					...types.map(t => {
						return `		this.r.n.${t}.push(...node.r.n.${t});`
					}),
						`	}`,
						`	return $changed;`,
						`}`])
				]
		);
		parent_codegen.env.add_Template(`component_For_${this.uid}`, for_code);
	}

	get_NewNode() {
		return `component_For_${this.uid}`;
	}

	get_CustomInputs() {
		const ans = {};
		const scope_deps = this.get_ScopedInputs();
		scope_deps.forEach(i => {
			ans[i] = {
				constant: true,
				code: `this.i.${i}`,
			}
		});
		return ans;
	}

	get_ScopedInputs(codegen) {
		const deps = this.scope_deps;
		return [...deps];
	}

	get_Type() {
		return this.types;
	}

	static get type() {
		return Types.NONE;
	}
}

class SDML_Slot extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.slotname = ast.attributes.name;
		if (this.slotname === undefined) {
			throw new SDML_Compile_Error(`in node <for id="${this.id}"/> it requires a 'iter' parameter like: <for array="..." iter="parameter"/> where parameter is a valid identifier name`);
		}
		if (!(this.slotname in this.scope.slots)) {
			throw new SDML_Compile_Error(`in node <slot name="${this.slotname}"/> is not defined in the current scope`);
		}
		if (this.scope.slots[this.slotname].used) {
			throw new SDML_Compile_Error(`in node <slot name="${this.slotname}"/> is already referenced once`);
		}
		this.scope.slots[this.slotname].used = true;
		this.types = this.scope.slots[this.slotname].types.clone();
	}

	static entries = [];
	static inputs = Types.NONE;

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(slot name=${this.slotname})`);
		link.push(`Slot_${this.slotname} --> Node_${this.uid}`);
	}

	receive_Sub(types, collection, match_type) {
	}

	add_ToCollection(collection, param) {
		this.types.type_names.forEach(type => {
			collection.add(param, type, this)
		})
	}

	get_NewNode(codegen) {
		return `component_Slot`;
	}

	get_CustomChildrenParam(nodename, type) {
		return `...this.${nodename}.${type}`;
	}

	get_CustomInit(nodename, type) {
		return `s.${this.slotname}`;
	}

	get_CustomUpdate(codegen, nodename) {
		const [[layer, mask]] = codegen.bitmasks.get_Masks([codegen.get_MaskedName(codegen.get_NodeCache(this))]);
		return [`this.b[${layer}] |= ${mask};`, `this.${nodename} = s.${this.slotname};`];
	}

	get_CustomDispose(nodename) {
		return `this.${nodename} = undefined;`;
	}

	get_Type() {
		return this.types;
	}

	static get type() {
		return Types.NONE;
	}
}

class SDML_ComponentNode extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast, component) {
		const params = {};
		for (const param in component.inputs) {
			params[param] = component.inputs[param].default !== undefined ? {
				datatype: component.inputs[param].datatype,
				code: component.inputs[param].default,
			} : {
				datatype: component.inputs[param].datatype,
			}
		}
		super(scope, name, id, parent, ast, params);
		this.component = component;
		this.collection = null;
		this.types = component.types.clone();
	}

	static entries = [];
	static inputs = Types.NONE;

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(component url=${this.component.url})`);
		for (const slotname in this.collection.collection) {
			const nodes = this.collection.get_All(slotname);
			for (const node of nodes) {
				link.push(`Node_${node.uid} --> Node_${this.uid}`);
			}
		}
	}

	receive_Sub(types, collection, match_type) {
		this.collection = collection;
		for (const slotname in collection.collection) {
			const nodes = collection.get_All(slotname);
			for (const node of nodes) {
				this.scope.graph.add_Edge(node, this);
			}
		}
	}

	add_ToCollection(collection, param) {
		this.types.type_names.forEach(type => {
			collection.add(param, type, this)
		})
	}

	get_NewNode(codegen) {
		return `component_Component_${this.component.uid}`;
	}

	get_NodeSlots(codegen) {
		const ans = {};
		const set = new Set(Object.keys(this.component.slots));
		for (const slot_name of this.collection.slots_name) {
			set.delete(slot_name);
			const slot = this.collection.get(slot_name);
			const map = {};
			ans[slot_name] = map;
			const type_set = new Set(this.component.slots[slot_name].types.type_names);
			for (const type in slot) {
				type_set.delete(type);
				const sub_nodes = [...this.collection.get_Class(slot_name, type)];
				const mapped_nodes = sub_nodes.reduce((last, cnt) => {
					last.push(...cnt.get_TypeMapped(type));
					return last;
				}, []);
				// console.log(mapped_nodes);
				map[type] = mapped_nodes;
			}
			type_set.forEach(type => {
				map[type] = [];
			})
		}
		set.forEach(slot_name => {
			const map = {};
			ans[slot_name] = map;
			for (const type of this.component.slots[slot_name].types.type_names) {
				map[type] = [];
			}
		})
		return ans;
	}

	get_Type() {
		return this.types;
	}

	static get type() {
		return Types.NONE;
	}
}

class SDML_Compute extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		const exp_type = ALL_INPUTS_TYPES[SDML_Compute.get_HintType(ast)[0]].datatype();
		// console.log(exp_type);
		super(scope, name, id, parent, ast, {
			exp: {
				datatype: exp_type
			}
		});
		// console.log(ast, this);
	}

	static inputs = Types.NONE;

	to_Mermaid(ans) {
		ans.push(`Node_${this.uid}(compute id=${this.id})`);
	}

	receive_Sub(types, collection, match_type) {
	}

	add_ToCollection(collection, param) {
	}

	get_NewNode(codegen) {
		return codegen.get_Template('TAG_ComputeBase_0');
	}

	get_Type() {
		return SDML_Compute.type;
	}

	static get type() {
		return new Types();
	}

	static get_HintType(ast) {
		const types = [];
		for (const type in ALL_INPUTS_TYPES) {
			if (type in ast.attributes) types.push(type);
		}
		return types;
	}

	static get_ExportsTypes(ast) {
		const types = SDML_Compute.get_HintType(ast);
		if (types.length === 0)
			throw new SDML_Compile_Error(`compute node required a type hint like: <compute int exp="..."/>`);
		if (types.length > 1)
			throw new SDML_Compile_Error(`multiple type hints appear in node <compute ${types.join(' ')} exp="..."/>`);
		return { result: ALL_INPUTS_TYPES[types[0]].datatype() };
	}
}

class SDML_Collect extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.exp_type = SDML_Collect.get_HintType(ast)[0];
		this.subs = [];
		// console.log(ast, this);
	}

	static inputs = Types.NONE;

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(collect id=${this.id})`);
		for (const sub of this.subs) {
			link.push(`Node_${sub.uid} -->|${this.exp_type}| Node_${this.uid}`);
		}
	}

	receive_Sub(types, collection, match_type) {
		const defaults = collection.get_Class('default', this.exp_type);
		this.subs = defaults;
		for (const node of defaults) {
			this.scope.graph.add_Edge(node, this);
		}
	}

	add_ToCollection(collection, param) {
	}

	get_NewNode(codegen) {
		const { name, code } = SDML_Templates.TAG_CollectBase(this.exp_type);
		codegen.env.add_Template(name, code);
		return name;
	}

	get_NodeChildren(codegen) {
		const ans = { default: { [this.exp_type]: [] } };
		this.subs.forEach(s => ans.default[this.exp_type].push(...s.get_TypeMapped(this.exp_type)));
		return ans;
	}

	get_Type() {
		return SDML_Compute.type;
	}

	static get type() {
		return new Types();
	}

	static get_HintType(ast) {
		const types = [];
		for (const type in ALL_INPUTS_TYPES) {
			if (type in ast.attributes) types.push(type);
		}
		return types;
	}

	static get_ExportsTypes(ast) {
		const types = SDML_Collect.get_HintType(ast);
		if (types.length === 0)
			throw new SDML_Compile_Error(`collect node required a type hint like: <collect int/>`);
		if (types.length > 1)
			throw new SDML_Compile_Error(`multiple type hints appear in node <collect ${types.join(' ')}/>`);
		return { result: ExpTypes.array(ALL_INPUTS_TYPES[types[0]].datatype()) };
	}

	static get_InputsTypes(ast) {
		const types = SDML_Collect.get_HintType(ast);
		if (types.length === 0)
			throw new SDML_Compile_Error(`collect node required a type hint like: <collect int/>`);
		if (types.length > 1)
			throw new SDML_Compile_Error(`multiple type hints appear in node <collect ${types.join(' ')}/>`);
		return { default: { default: new Types({ [types[0]]: Infinity }) } };
	}
}

class SDML_Cache extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.exp_type = SDML_Cache.get_HintType(ast)[0];
		this.subs = [];
		// console.log(ast, this);
	}

	static inputs = Types.NONE;

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(cache id=${this.id})`);
		for (const sub of this.subs) {
			link.push(`Node_${sub.uid} -->|${this.exp_type}| Node_${this.uid}`);
		}
	}

	receive_Sub(types, collection, match_type) {
		const defaults = collection.get_Class('default', this.exp_type);
		this.subs = defaults;
		for (const node of defaults) {
			this.scope.graph.add_Edge(node, this);
		}
	}

	add_ToCollection(collection, param) {
	}

	get_NewNode(codegen) {
		const { name, code } = SDML_Templates.TAG_CacheBase(this.exp_type);
		codegen.env.add_Template(name, code);
		return name;
	}

	get_NodeChildren(codegen) {
		const ans = { default: { [this.exp_type]: [] } };
		this.subs.forEach(s => ans.default[this.exp_type].push(...s.get_TypeMapped(this.exp_type)));
		return ans;
	}

	get_Type() {
		return SDML_Cache.type;
	}

	static get type() {
		return new Types();
	}

	static get_HintType(ast) {
		const types = [];
		for (const type in ALL_INPUTS_TYPES) {
			if (type in ast.attributes) types.push(type);
		}
		return types;
	}

	static get_ExportsTypes(ast) {
		const types = SDML_Cache.get_HintType(ast);
		if (types.length === 0)
			throw new SDML_Compile_Error(`collect node required a type hint like: <cache int/>`);
		if (types.length > 1)
			throw new SDML_Compile_Error(`multiple type hints appear in node <cache ${types.join(' ')}/>`);
		return { result: ALL_INPUTS_TYPES[types[0]].datatype() };
	}

	static get_InputsTypes(ast) {
		const types = SDML_Cache.get_HintType(ast);
		if (types.length === 0)
			throw new SDML_Compile_Error(`collect node required a type hint like: <cache int/>`);
		if (types.length > 1)
			throw new SDML_Compile_Error(`multiple type hints appear in node <cache ${types.join(' ')}/>`);
		return { default: { default: new Types({ [types[0]]: 1 }) } };
	}
}

class SDML_Add extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast);
		this.matched = null;
		this.subs = [];
	}

	static entries = [];
	static inputs = {
		default: {
			default: new Types({
				number: Infinity
			})
		},
	};
	static exports = {
		result: ExpTypes.base(ExpTypes.float),
	}

	to_Mermaid(ans, link) {
		ans.push(`Node_${this.uid}(add id=${this.id} match=${this.matched})`);
		if (this.matched === 'default')
			for (const sub of this.subs) {
				link.push(`Node_${sub.uid} -->|number| Node_${this.uid}`);
			}
	}

	receive_Sub(types, collection, match_type) {
		this.matched = match_type;
		switch (match_type) {
			case 'default': {
				const defaults = collection.get_Class('default', 'number');
				this.subs = defaults;
				for (const node of defaults) {
					this.scope.graph.add_Edge(node, this);
				}
				break;
			}
		}
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'number', this);
	}

	get_NewNode(codegen) {
		return codegen.get_Template('TAG_Add_0');
	}

	get_NodeChildren(codegen) {
		switch (this.matched) {
			case 'default': {
				const ans = { default: { number: [] } };
				this.subs.forEach(s => ans.default.number.push(...s.get_TypeMapped('number')));
				return ans;
			}
		}
	}

	get_Type() {
		return SDML_Add.type;
	}

	static get type() {
		return new Types({ number: 1 });
	}
}

class SDML_Number extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast, {
			n: {
				datatype: ExpTypes.base(ExpTypes.number),
				default: '0'
			},
		});
	}

	static inputs = Types.NONE;

	to_Mermaid(ans) {
		ans.push(`Node_${this.uid}(number id=${this.id})`);
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'number', this);
	}

	get_Type() {
		return SDML_Number.type;
	}

	get_NewNode(codegen) {
		return codegen.get_Template('TAG_Number_0');
	}

	static get type() {
		return new Types({ number: 1 });
	}
}

class SDML_Number2 extends SDML_Compiler_Visitor {
	constructor(scope, name, id, parent, ast) {
		super(scope, name, id, parent, ast, {
			int: {
				datatype: ExpTypes.base(ExpTypes.int)
			},
			float: {
				datatype: ExpTypes.base(ExpTypes.float)
			},
		});
	}

	static inputs = Types.NONE;

	to_Mermaid(ans) {
		ans.push(`Node_${this.uid}(number2 id=${this.id})`);
	}

	add_ToCollection(collection, param) {
		collection.add(param, 'int', this);
		collection.add(param, 'float', this);
	}

	get_Type() {
		return SDML_Number2.type;
	}

	get_NewNode(codegen) {
		return codegen.get_Template('TAG_Number_2');
	}

	static get type() {
		return new Types({ int: 1, float: 1 });
	}
}

function create_Component(class_name,
	default_inputs = [],
	bit_masks = 0,
	nodes_decl = [],
	params_decl = [],
	init = [],
	diff = [],
	result,
	nodes_dispose = [],
	refs = [],
	updates = [],) {
	const bitmasks = [];
	for (let i = 0; i < bit_masks; i++) {
		bitmasks.push('0');
	}
	return `class ${class_name} extends ComponentBase {
	constructor(i = {}, c, s) {
		super({${default_inputs.join(', ')}${default_inputs.length === 0 ? '' : ', '}...i}, [${bitmasks.join(', ')}]);
		this.r = null;${nodes_decl.map(s => `\n\t\t${s}`).join('')}${params_decl.map(s => `\n\t\t${s}`).join('')}
		this.init(c, s);
	}
	init(c, s) {${init.map(s => `\n\t\t${s}`).join('')}${result === undefined ? '' : `\n		this.r = ${result};`}
	}
	diff(i) {
		this.b = [${bitmasks.join(', ')}];${diff.map(s => `\n\t\t${s}`).join('')}
	}
	update(i, c, s) {
		this.diff(i);${updates.map(s => `\n\t\t${s}`).join('')}
	}
	dispose() {${nodes_dispose.map(s => `\n\t\t${s}`).join('')}
		// console.log(">>>> dispose ${class_name}");
	}
	ref(id) {
		switch (id) { ${refs.map(([id, cache]) => `\n\t\t\tcase '${id}': return this.${cache};`).join('')}
		}
	}
}`
}

class SDML_Compile_CodeGen {
	constructor(env, class_name, scope, opt) {
		this.opt = { for_diff: true, if_branch_cache: false, inline_contanst_exp: false, ...opt };
		this.env = env;
		this.class_name = class_name;
		this.scope = scope;
		this.nodes = new Map();
		this.params = new Map();
		this.noderefs = new Set();
		this.nodemap = {};
		this.bitmasks = null;
	}

	get_NodeCache(node) {
		return this.nodes.get(node);
	}

	get_NodeCache_with_ID(id) {
		const node = this.scope.nodemap[id];
		return this.get_NodeCache(node);
	}

	get_NodeParamCache(node, param) {
		return this.params.get(node)?.[param];
	}

	get_Template(template) {
		const { name, code } = SDML_Templates[template] ?? {};
		if (name !== undefined) {
			this.env.add_Template(name, code);
		}
		return name;
	}

	get_DefaultInputs(inputs = undefined) {
		if (inputs) {
			const arr = [];
			const map = this.scope.inputs;
			for (const param of inputs) {
				arr.push(`${param}: ${map[param]?.default ?? 'null'}`);
			}
			return arr;
		}
		else {
			const arr = [];
			const deps = [...this.scope.scope_deps];
			const map = this.scope.inputs;
			for (const param of deps) {
				arr.push(`${param}: ${map[param].default ?? 'null'}`);
			}
			return arr;
		}
	}

	get_NodesDeclaration() {
		const ans = [];
		this.nodes.forEach((val, key) => {
			ans.push(`this.${val} = null;`)
		})
		return ans;
	}

	get_ParamsDeclaration() {
		const ans = [];
		this.params.forEach((val, key) => {
			for (const param in val) {
				if (this.opt.inline_contanst_exp && key.params[param].opt.constant);
				else
					ans.push(`this.${val[param]} = null;`);
			}
		})
		return ans;
	}

	get_Refs() {
		return [...this.noderefs].map(id => [id, this.get_NodeCache_with_ID(id)]);
	}

	get_Diffs() {
		const ans = [];
		const bitmasks = [];
		for (let i = 0; i < this.bitmasks.mask_count; i++) {
			bitmasks.push('0');
		}
		// ans.push(`this.b = [${bitmasks.join(', ')}];`);
		for (const dep of this.scope.scope_deps) {
			ans.push(`if (i.${dep} !== undefined && i.${dep} !== this.i.${dep}) {`);
			const arr = this.bitmasks.get_Masks([dep]);
			for (const [idx, mask] of arr) {
				ans.push(`	this.i.${dep} = i.${dep};`);
				ans.push(`	this.b[${idx}] |= ${mask};`);
			}
			ans.push(`}`);
		}
		return ans;
	}

	get_Init() {
		const ans = [];
		for (const node of this.scope.order) {
			const obj_name = node.get_NewNode(this);
			const custom_init = node.get_CustomInit(obj_name);
			// param init
			const params = this.params.get(node)
			for (const param in params) {
				if (this.opt.inline_contanst_exp && node.params[param].opt.constant);
				else
					ans.push(`this.${params[param]} = ${node.params[param].code};`);
			}

			if (custom_init !== null)
				ans.push(`this.${this.get_NodeCache(node)} = ${custom_init};`)
			else
				ans.push(`this.${this.get_NodeCache(node)} = new ${obj_name}(${this.get_NodeInputs(node)}, ${this.get_NodeChildren(node)}, ${this.get_NodeSlots(node)});`)
		}
		return ans;
	}

	get_TypedResult(children, type) {
		const nodes_arr = [];
		for (const node of children[type]) {
			const node_name = this.get_NodeCache(node);
			nodes_arr.push(`...this.${node_name}.r.n.${type}`);
		}
		return nodes_arr;
	}

	get_Result() {
		const collection = this.scope.collection.get('default');
		const arr = [];
		for (const type in collection) {
			const nodes_arr = this.get_TypedResult(collection, type);
			arr.push(`${type}: [${nodes_arr.join(', ')}]`);
		}
		const arr2 = [];
		for (const output in this.scope.outputs) {
			const map = this.scope.outputs[output];
			arr2.push(`${output}: ${map.code}`);
		}
		return `{n:{${arr.join(', ')}}, e:{${arr2.join(', ')}}}`
	}

	get_NodeInputs(node) {
		const arr = [];
		const map = this.params.get(node);
		const custom_inputs = node.get_CustomInputs();
		for (const param in custom_inputs) {
			const input = custom_inputs[param];
			arr.push(`${param}: ${input.code}`);
		}
		for (const param in map) {
			if (this.opt.inline_contanst_exp && node.params[param].opt.constant)
				arr.push(`${param}: ${node.params[param].code}`);
			else
				arr.push(`${param}: this.${map[param]}`);
		}
		return `{${arr.join(', ')}}`;
	}

	get_NodeChildren(node) {
		// debugger
		const children_template = node.get_NodeChildren(this);
		const arr = [];
		for (const param in children_template) {
			const params = children_template[param];
			const types_arr = [];
			for (const type in params) {
				const subs_arr = params[type].map(subs => {
					const { node, type: subtype } = subs;
					const node_name = this.get_NodeCache(node);
					const custom_get = node.get_CustomChildrenParam(node_name, subtype);
					if (custom_get !== null) {
						return custom_get;
					}
					return `...this.${node_name}.r.n.${subtype}`;
				})
				types_arr.push(`${type}: [${subs_arr.join(', ')}]`);
			}
			arr.push(`${param}: {${types_arr.join(', ')}}`)
		}
		return `{${arr.join(', ')}}`;
	}

	get_NodeSlots(node) {
		const slots_template = node.get_NodeSlots(this);
		const arr = [];
		for (const param in slots_template) {
			const params = slots_template[param];
			const types_arr = [];
			for (const type in params) {
				const subs_arr = params[type].map(subs => {
					const { node, type: subtype } = subs;
					const node_name = this.get_NodeCache(node);
					return `...this.${node_name}.r.n.${subtype}`;
				})
				types_arr.push(`${type}: [${subs_arr.join(', ')}]`);
			}
			arr.push(`${param}: {${types_arr.join(', ')}}`)
		}
		return `{${arr.join(', ')}}`;
	}

	get_NodeUpdate(node) {
		const node_name = this.get_NodeCache(node);
		const custom_update = node.get_CustomUpdate(this, node_name);
		if (custom_update !== null) return custom_update;
		const ans = [];
		// console.log(node);
		// console.group(node_name);

		const [[n_layer, n_mask]] = this.bitmasks.get_Masks([this.get_MaskedName(node_name)]);
		// console.log(`layer: ${n_layer}, mask: ${n_mask}`);

		const params = this.params.get(node);
		// param update
		// console.log(params);
		const param_updates = [];
		for (const param in params) {
			if (this.opt.inline_contanst_exp && node.params[param].opt.constant) continue;
			const masks = [];
			const param_name = params[param];
			const [[p_layer, p_mask]] = this.bitmasks.get_Masks([this.get_MaskedName(param_name)]);
			{
				const masked_deps = [...node.params[param].opt.deps];
				const bitmasks = this.bitmasks.get_Masks(masked_deps);
				masks.push(...bitmasks.map(([layer, mask], idx, arr) => {
					const len = arr.length === 1;
					return `${len ? '' : '('}this.b[${layer}] & /* ${masked_deps} */ ${mask}${len ? '' : ')'}`;
				}));
			}
			{
				const masked_deps = [...node.params[param].opt.ids].map(i => this.get_MaskedName(this.get_NodeCache_with_ID(i)));
				const bitmasks = this.bitmasks.get_Masks(masked_deps);
				masks.push(...bitmasks.map(([layer, mask], idx, arr) => {
					const len = arr.length === 1;
					return `${len ? '' : '('}this.b[${layer}] & /* ${masked_deps} */ ${mask}${len ? '' : ')'}`;
				}));
			}
			if (masks.length > 0)
				param_updates.push(`if (${masks.join(" || ")}) {`, `	this.${param_name} = ${node.params[param].code};`, `	this.b[${p_layer}] |= ${p_mask};`,
					// debug
					// `	console.log(">> update ${node.name} uid: ${node.uid} - ${param}", this.b[${p_layer}]);`,
					`}`)
		}
		// console.log(param_updates.join('\n'));
		ans.push(...param_updates);

		// param init
		const masked_params = Object.entries(params).filter(([name, cachename]) => !this.opt.inline_contanst_exp || !node.params[name].opt.constant).map(([n, c]) => c).map(i => this.get_MaskedName(i));
		const params_templates = node.get_ScopedInputs(this);
		const children_template = node.get_NodeChildren(this);
		const slots_template = node.get_NodeSlots(this);
		const children = Object.values(children_template).map(i => Object.values(i)).flat(2).map(({ node }) => this.get_MaskedName(this.get_NodeCache(node)));
		const slots = Object.values(slots_template).map(i => Object.values(i)).flat(2).map(({ node }) => this.get_MaskedName(this.get_NodeCache(node)));
		masked_params.push(...children, ...slots, ...params_templates);
		const bitmasks = this.bitmasks.get_Masks(masked_params);
		const if_test = bitmasks.map(([layer, mask], idx, arr) => {
			const len = arr.length === 1;
			return `${len ? '' : '('}this.b[${layer}] & /* ${masked_params} */ ${mask}${len ? '' : ')'}`;
		});
		if (if_test.length > 0)
			ans.push(`if (${if_test.join(" || ")}) {`,
				// debug
				// `	console.log(">> update ${node.name} uid: ${node.uid}");`,
				`	this.b[${n_layer}] |= ${n_mask} & (this.${node_name}.update(${this.get_NodeInputs(node)}, ${this.get_NodeChildren(node)}, ${this.get_NodeSlots(node)}) ? 2147483647 : 0);`,
				`}`)

		// console.log(masked_params);

		// console.groupEnd(node_name);
		return ans;
	}

	get_Update() {
		const ans = [`let $changed = false;`];
		for (const node of this.scope.order) {
			// console.log(node);
			ans.push(...this.get_NodeUpdate(node));
		}
		// update result
		for (const output in this.scope.outputs) {
			const map = this.scope.outputs[output];
			const masked_node = [...map.opt.ids].map(i => this.get_MaskedName(this.get_NodeCache_with_ID(i)));
			const deps = [...map.opt.deps];
			// console.log(output, masked_node, deps);
			const masked_deps = [...masked_node, ...deps];
			const bitmasks = this.bitmasks.get_Masks(masked_deps);
			const if_test = bitmasks.map(([layer, mask], idx, arr) => {
				const len = arr.length === 1;
				return `${len ? '' : '('}this.b[${layer}] & /* ${masked_deps} */ ${mask}${len ? '' : ')'}`;
			});
			if (if_test.length > 0)
				ans.push(`if (${if_test.join(" || ")}) {`,
					`	$changed = true;`,
					`	this.r.e.${output} = ${map.code};`,
					`}`)
		}
		// update nodes
		// console.log(this.scope.collection);
		const slots = this.scope.collection.get('default');
		for (const type_name in slots) {
			const nodes = [...slots[type_name]];
			const masked_nodes = nodes.map(i => this.get_MaskedName(this.get_NodeCache(i)));
			const bitmasks = this.bitmasks.get_Masks(masked_nodes);
			const if_test = bitmasks.map(([layer, mask], idx, arr) => {
				const len = arr.length === 1;
				return `${len ? '' : '('}this.b[${layer}] & /* ${masked_nodes} */ ${mask}${len ? '' : ')'}`;
			});
			if (if_test.length > 0)
				ans.push(`if (${if_test.join(" || ")}) {`,
					`	$changed = true;`,
					`	this.r.n.${type_name} = [${this.get_TypedResult(slots, type_name).join(', ')}];`,
					`}`)
		}

		// ans.push(`console.log(">>> updated component_${this.scope.uid}", $changed);`);
		ans.push('return $changed;');
		// for (const output in this.scope.outputs) {
		// 	const map = this.scope.outputs[output];
		// 	const masked_node = [...map.opt.ids].map(i => this.get_MaskedName(this.get_NodeCache_with_ID(i)));
		// 	const deps = [...map.opt.deps];
		// 	// console.log(output, masked_node, deps);
		// 	const masked_deps = [...masked_node, deps];
		// 	const bitmasks = this.bitmasks.get_Masks(masked_deps);
		// 	const if_test = bitmasks.map(([layer, mask], idx, arr) => {
		// 		const len = arr.length === 1;
		// 		return `${len ? '' : '('}this.b[${layer}] & ${mask}${len ? '' : ')'}`;
		// 	});
		// 	if (if_test.length > 0)
		// 		ans.push(`if (${if_test.join(" || ")}) {`,
		// 			`	this.r.e.${output} = ${map.code};`,
		// 			`}`)
		// }
		// console.log(ans.join('\n'));
		return ans;
	}

	get_NodesDispose() {
		const ans = [];
		for (const node of [...this.nodes.keys()]) {
			const node_name = this.get_NodeCache(node);
			const custom_dispose = node.get_CustomDispose(node_name);
			if (custom_dispose !== null) {
				if (custom_dispose !== '')
					ans.push(custom_dispose);
			}
			else
				ans.push(`this.${node_name}.dispose();`);
		}
		// ans.push(`console.log(\`dispose ${this.class_name}\`);`);
		return ans;
	}

	get_MaskedName(name) {
		return `$$${name}`;
	}

	generate() {
		const deps_nodes_arr = [...this.scope.scope_deps];
		for (const output in this.scope.outputs) {
			this.scope.outputs[output].opt.ids.forEach(n => {
				this.noderefs.add(n);
			});
		}
		for (const node of this.scope.order) {
			const node_name = `node_${node.uid}`;
			deps_nodes_arr.push(this.get_MaskedName(node_name));
			node.generate(this);
			this.nodes.set(node, node_name);
			const map = {};
			this.params.set(node, map);
			node.noderefs.forEach(n => {
				this.noderefs.add(n);
			});
			for (const param in node.params) {
				const param_name = `node_${node.uid}_param_${param}`
				map[param] = param_name;
				// console.log(param, param_name, node.params[param].opt.constant);
				if (this.opt.inline_contanst_exp && node.params[param].opt.constant);
				else
					deps_nodes_arr.push(this.get_MaskedName(param_name));
			}
			// console.log(this.get_NodeInputs(node));
		}
		this.bitmasks = new BitMask(deps_nodes_arr);
		// console.log(this.bitmasks);
		return create_Component(this.class_name,
			this.get_DefaultInputs(),
			this.bitmasks.mask_count,
			this.get_NodesDeclaration(),
			this.get_ParamsDeclaration(),
			this.get_Init(),
			this.get_Diffs(),
			this.get_Result(),
			this.get_NodesDispose(),
			this.get_Refs(),
			this.get_Update());
	}
}

const ALL_NODE_TYPES = {
	'if': SDML_If,
	'for': SDML_For,
	'slot': SDML_Slot,
	'add': SDML_Add,
	'num': SDML_Number,
	'num2': SDML_Number2,
	'compute': SDML_Compute,
	'collect': SDML_Collect,
	'cache': SDML_Cache,
}

// const a = new Types({ a: 1 });
// const b = new Types({ b: Infinity, a: Infinity });
// console.log(a.match_Types(b, true))
// const a1 = new Types({ a: 1 });
// const b1 = new Types({ b: 1, a: 1 });
// console.log(a1.match_Types(b1, true))
// const a2 = new Types({ a: 1 });
// const b2 = new Types({ a: Infinity });
// console.log(a2.match_Types(b2, true))
// const a3 = new Types();
// const b3 = new Types({ a: Infinity });
// console.log(a3.match_Types(b3, true))
// const a4 = new Types({ b: 1 });
// const b4 = new Types({ a: Infinity });
// console.log(a4.match_Types(b4, true))

class BitMask {
	constructor(inputs = []) {
		this.inputs = inputs;
		this.count = inputs.length;
		this.int_count = Math.ceil(this.count / 31);
	}

	static add_Mask(i, pos) {
		return i | (1 << pos);
	}

	get_Index(input) {
		return this.inputs.indexOf(input);
	}

	get_Masks(inputs) {
		const ans = {};
		for (const input of inputs) {
			const idx = this.get_Index(input);
			if (idx === -1) continue;
			const pos = idx % 31;
			const cnt = Math.floor(idx / 31);
			if (cnt in ans) {
				ans[cnt] = BitMask.add_Mask(ans[cnt], pos);
			}
			else {
				ans[cnt] = BitMask.add_Mask(0, pos);
			}
		}
		return Object.entries(ans).map(([cnt, pos]) => [parseInt(cnt), pos]);
	}

	get mask_count() {
		return this.int_count;
	}

	to_String() {

	}
}

TypesManagerSingleton.extends(null, 'number', {
	n: {
		datatype: ExpTypes.base(ExpTypes.number),
		default: '0'
	}
})

TypesManagerSingleton.extends('number', 'int', {
	n: {
		datatype: ExpTypes.base(ExpTypes.int),
		default: '0'
	}
})

TypesManagerSingleton.extends('number', 'float', {
	n: {
		datatype: ExpTypes.base(ExpTypes.float),
		default: '0.0'
	}
})