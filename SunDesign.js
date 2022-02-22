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
		const err = ast[3];
		const errs = [];
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

function parse_Expression(str, name = "Source", inputs) {
	const source = new SourceScript(str, name);
	const lexer = new SunDesignExpressionLexer(source);
	lexer.tokenize();
	if (lexer.errors.length > 0) {
		return [null, lexer.errors.map(err => {
			let [s, starter] = source.get_ScriptPortion(err.start, err.end, '^', undefined, false)
			return `${s}\n${starter}${err.type}`
		})]
	}
	const ast = sunlang.match(lexer.tokens);
	if (ast[3] !== undefined) {
		const err = ast[3];
		const errs = [];
		while (err !== undefined) {
			errs = err;
			err = err.last;
		}
		const first = errs;
		const [s, starter] = source.get_ScriptPortion(first.start, first.end, '^', undefined, false)
		return [null, [`${s}\n${starter}${first.type}\n${first.message.split('\n').map(i => starter + i).join('\n')}`]]
	}
	else {
		const walker = SunDesignExpressionTypeCheckPass;
		const [astnew, err] = walker.walk(source, ast[2][1], inputs);
		if (err.length > 0) {
			return [null, err.map((err) => {
				const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
				return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
			})]
		}

		const walker2 = SunDesignExpressionOptimizationPass
		const [astnew2, err2] = walker2.walk(source, astnew);
		if (err2.length > 0) {
			return [null, err2.map((err) => {
				const [s, starter] = source.get_ScriptPortion(err.start, err.end, '^')
				return `${s}${starter}${err.type}\n${err.message.split('\n').map(i => `${starter}` + `${i}`).join('\n')}`;
			})]
		}

		return [astnew2, []];


		const walker3 = SunDesignExpressionCodeGenPass
		const [code, opt] = walker3.generate(astnew2);
		return [code, []];
	}
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

	static get_Type() {
		return "node";
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
			template: null,
			export: null,
		};
		this.sdml = sdml;
		this.urlmap = {};
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
			if (! /^[\_|a-zA-Z](\w)*$/.test(name)) {
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
			if (! /^[\_|a-zA-Z](\w)*$/.test(name)) {
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

		// console.log(this.inputs, this.outputs);
	}

	compile() {
		// template types
		if (this.xmlast.type === null) {
			// self check
			const templates = this.xmlast.template ?? [];
			const type = {};
			for (let i of templates) {
				const name = i.tagName;
				let cut_type = {};
				if (name in ALL_NODE_TYPES) {
					const typename = ALL_NODE_TYPES[name].type;
					cut_type = {
						[typename]: 1
					}
				}
				else if (name in this.urlmap) {
					const subcom = this.env.get(this.urlmap[name]);
					if (subcom === null) {
						throw new Error(`possible circular refs found in ${this.url} when referencing ${this.urlmap[name]} as ${name}`);
					}
					cut_type = subcom.type;
				}
				else {
					throw new Error(`type of node <${name}/> can not but directly resolved in\n<template>\n\t<${name}/>\n</template>\nin ${this.url}\nyou may want to use <type/> entry to define component's type explicitly`);
				}
				for (let key in cut_type) {
					type[key] = (type[key] ?? 0) + cut_type[key];
				}
			}
			this.type = type;
		}
		else {
			// use def type
			const types = this.xmlast.type ?? [];
			const type = {};
			for (let i of types) {
				const name = i.tagName;
				const { count } = i.attributes;
				if (count === undefined) {
					type[name] = Infinity;
				}
				else if (/^[0-9]*$/.test(count)) {
					type[name] = (type[name] ?? 0) + parseInt(count);
				}
				else {
					throw new Error(`type's count '${count}' in\n<type>\n\t<${name} count="${count}"/>\n</type>\nis invalid in ${this.url}`)
				}
			}
			this.type = type;
		}
		this.compile_res = new SDML_Compile_Scope(this.env, this.urlmap, this.xmlast.template, this.inputs, this.outputs, null, {});
		// console.log(`>>>>> '${this.url}' pre compile pass 2`);
		// console.log(this.type);
		// console.log(`>>>>> '${this.url}' compile`);
		// new SDML_Compiler().compile(this.xmlast);
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
		for (let key in this.type) {
			type.push(`<${key} /> * ${this.type[key]}`)
		}
		return `>| component_${this.uid.toString()}
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
		if (edges.size > 0) throw new DepGraphError('fail to sort graph as topological order, one or more circlar references may exist', edges);
		return order;
	}

	to_Mermaid() {
		/**
		graph LR
			A[Christmas] -->|Get money| B(Go shopping)
					B --> C{Let me think}
			C -->|One| D[Laptop]
			C -->|Two| E[iPhone]
			C -->|Three| F[fa:fa-car Car]
				*/
		const links = [...this.edges.entries()].map(([key, val]) => {
			if (val.size === 0) return [`\t${key.toGraphNode()}`]
			return [...val.entries()].map(([val]) => `\t${val.toGraphNode()} --> ${key.toGraphNode()}`)
		}).flat(1);
		return `graph LR\n${links.join("\n")}`;
	}

}

class SDML_Compile_Scope {
	constructor(env, urlmap, template, inputs, outputs, parent = null, opt) {
		this.env = env;
		this.urlmap = urlmap;
		this.template = template;
		this.opt = opt;
		this.inputs = inputs ?? {};
		this.outputs = outputs ?? {};
		this.parent = parent;
		this.subscope = [this];
		this.graph = new DepGraph();
		this.compile();
	}

	new_Scope(template, parent = this) {
		const scope = new SDML_Compile_Scope(this.env, this.urlmap, template, this.inputs, this.outputs, parent, this.opt);
		this.subscope.unshift();
		return scope;
	}

	exit_Scope(scope) {
		if (this.subscope[0] === scope) this.subscope.shift();
		throw new SDML_Compile_Error(`scope exit error current scope is not the wanted one`);
	}

	get_NodeInstance(tagName) {
		if (tagName in ALL_NODE_TYPES) {
			return new ALL_NODE_TYPES[tagName](this, tagName);
		}
		if (tagName in this.urlmap) {
			const component = this.env.get(this.urlmap[tagName]);
			// console.log(component);
			return new SDML_Compiler_Visitor(this, tagName);
		}
	}

	walk(nodes = [], parent = null) {
		nodes.forEach(n => {
			// add link
			const name = n.tagName;
			const child = this.get_NodeInstance(name);
			if (parent === null) this.graph.add_Node(child);
			else {
				this.graph.add_Edge(child, parent);
				this.graph.add_Edge(parent, child);
			}
			if (n.children.length > 0) {
				// console.group(`<${name}>`);
				this.walk(n.children, child);
				// console.groupEnd(`<${name}/>`);
			}
			// console.log(`<${name}/>`);
		})
	}

	compile() {
		console.log("compile!!!");
		this.walk(this.template);
		try {
			console.warn(this.graph.get_TopologicalOrder());
		}
		catch (err) {
			render_Graph(err.graph).then(svg => {
				console.log(`${err.to_String()}\nGraph Preview:\n\t%c %c`, `border: black 1px solid; background: url("data:image/svg+xml;base64,${btoa(svg)}") no-repeat center; padding: 80px 240px; background-size: contain;`, "");
			})
			// console.log(err.to_String());
		}
		// console.log(this.graph.to_Mermaid());
	}
}

class SDML_Compiler_Visitor {
	constructor(scope, name) {
		this.scope = scope;
		this.name = name;
		this.uid = scope.env.uid;
	}

	compile() {
		console.log(this);
	}

	toGraphNode() {
		return `Node${this.uid}(${this.name} uid:${this.uid})`;
	}

	toString() {
		return `${this.name}_${this.uid}`;
	}

	to_String(subs = []) {
		return `<${this.name}>\n${subs.map(s => '\t' + s).join('\n')}\n</${this.name}>`
	}

	static get type() {
		return 'visitor';
	}
}

const ALL_NODE_TYPES = {
	box: SDML_Compiler_Visitor,
	circle: SDML_Compiler_Visitor,
	if: SDML_Compiler_Visitor,
}