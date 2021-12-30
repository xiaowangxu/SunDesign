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
				const component = new SDML_Component(this.env, str, resolve);
			}
			catch (err) {
				reject(err);
			}
		});
	}
}

export class Environment {
	constructor(loaders) {
		this.urlmap = {};
		this.caches = {};
		this.promises = [];
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
		const promise = new ComponentWebLoader(this).load(url).then((component) => {
			this.caches[url] = component;
		});
		this.promises.push(promise);
	}

	load(loader, url) {
		if (this.caches[url] !== undefined) return Promise.resolve();
		this.caches[url] = null;
		const promise = this.loaders[loader].load(url).then((component) => {
			this.caches[url] = component;
		});
		return promise;
	}

	onLoaded() {
		return Promise.all(this.promises);
	}

	compile() {
		for (let key in this.caches) {
			const component = this.caches[key];
			if (component instanceof SDML_Node) {
				component.compile();
			}
		}
	}
}

class SDML_Node {
	constructor(env) {
		this.env = env;
		this.inputs = {};
		this.outputs = {};
	}

	compile() {
	}
}

class SDML_Parse_Error extends Error {
	constructor(msg) {
		super(msg);
		this.name = "SDML_Parse_Error";
	}
}

class SDML_Component extends SDML_Node {
	constructor(env, sdml, onready) {
		super(env);
		this.xmlast = null;
		this.urlmap = {};
		this.onready = onready;
		this.parse_XML(sdml);
		this.collect_Resources();
	}

	parse_XML(sdml) {
		const xmlparser = new XMLParser(sdml);
		if (xmlparser.error !== null) {
			throw new Error(xmlparser.error);
		}
		this.xmlast = xmlparser.result;
	}

	collect_Resources() {
		if (this.xmlast.length !== 1 || this.xmlast[0].tagName !== 'component') throw new SDML_Parse_Error("an SDML Component should always contain only one root node: <component/>");
		this.xmlast = this.xmlast[0];
		const refs = this.xmlast.children.filter(c => c.tagName === "refs").reduce((last, cnt) => {
			last.push(...cnt.children);
			return last;
		}, []);
		const promises = [];
		refs.forEach(ref => {
			if (!this.env.is_ResourceType(ref.tagName)) throw new SDML_Parse_Error(`<${ref.tagName} /> sub Resource is not loadable, try remove it from SDML or mount relative loader`);
			if (ref.attributes.url === undefined || ref.attributes.url === '') throw new SDML_Parse_Error("an SDML Component's sub Resource should always contain url attribute: <resource-type url=\"...\" />");
			if (ref.attributes.id === undefined || ref.attributes.id === '') throw new SDML_Parse_Error("an SDML Component's sub Resource should always contain id attribute: <resource-type id=\"...\" />");
			const id = ref.attributes.id;
			const url = ref.attributes.url;
			this.urlmap[id] = url;
			promises.push(this.env.load(ref.tagName, url))
		})
		Promise.all(promises).then(() => {
			this.onready(this);
			delete this.onready;
		});
	}

	compile() {
		SDML_COMPILER.compile(this.xmlast);
	}
}

// SDML Compiler
class SDML_Compile_Error extends Error {
	constructor(msg) {
		super(msg);
		this.name = "SDML_Compile_Error";
	}
}

class SDML_Compiler {
	constructor(visitors) {
		this.visitors = {};
		visitors.forEach(v => this.mount_Visitor(v));
	}

	mount_Visitor(visitor) {
		if (!visitor instanceof SDML_Compiler_Visitor) throw new SDML_Compile_Error("the visitor to be mounted is not type of SDML_Compiler_Visitor class")
		if (this.visitors[visitor.name] !== undefined) return;
		this.visitors[visitor.name] = visitor;
	}

	compile(component) {
		const visitors = { ...this.visitors }
		if (!component instanceof SDML_Node) throw new SDML_Compile_Error("the compile input should be a SDML_Node")
		console.log(">>>> compiling", component);
	}
}

class SDML_Compiler_Visitor {
	constructor(tagname, inputs, outputs) {
		this.name = tagname;
		this.inputs = null;
		this.outputs = null;
	}

	to_String(subs) {
		return `<${this.name}>\n${subs.map(s => '\t' + s).join('\n')}\n</${this.name}>`
	}
}

class SDML_Inputs_Visitor extends SDML_Compiler_Visitor {
	constructor() {
		super("inputs");
	}
}

class SDML_Refs_Visitor extends SDML_Compiler_Visitor {
	constructor() {
		super("refs");
	}
}

class SDML_Outputs_Visitor extends SDML_Compiler_Visitor {
	constructor() {
		super("outputs");
	}
}

class SDML_Component_Visitor extends SDML_Compiler_Visitor {

}

const SDML_COMPILER = new SDML_Compiler([
	new SDML_Inputs_Visitor(),
	new SDML_Refs_Visitor(),
	new SDML_Outputs_Visitor(),
]);