import { Language, Match, MatchTerm, MatchToken, Once_or_None, More_or_None, ChooseOne, LLkChooseOne, SourceScript, ScriptPosition, BaseError, Lexer, Walker, Token, typeToString, typeCheck, cloneType } from "./sPARks.js"

// import { Matrix4, Quaternion, Euler, Vector3 } from '../lib/three/src/Three.js';

export { SourceScript, typeCheck, typeToString }

export class SunDesignExpressionLexer extends Lexer {
	constructor(sourcescript) {
		super(sourcescript)
	}

	get_ID() {
		let identifier = "";
		let position = this.current_pos.clone();

		this.advance();

		while (!this.is_EOF() && this.is_IdentifierChar(this.current)) {
			position = this.current_pos.clone();
			identifier += this.current;
			this.advance();
		}

		if (identifier.length === 0) {
			this.errors.push(new BaseError("InvalidIDError", "#", this.last_pos, position));
		}

		this.tokens.push(new Token('TK_ID', identifier, this.last_pos, position));
		this.syntaxhighlightstr += this.tint(identifier, 'identifier');
	}

	get_Identifier() {
		let identifier = "";
		let position = this.current_pos.clone();

		while (!this.is_EOF() && this.is_IdentifierChar(this.current)) {
			position = this.current_pos.clone();
			identifier += this.current;
			this.advance();
		}

		const KEYWORD = ['and', 'or', 'not'];

		if (KEYWORD.includes(identifier)) {
			this.tokens.push(new Token('TK_KEYWORD', identifier, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'keyword');
		}
		else if (identifier === 'false') {
			this.tokens.push(new Token('TK_BOOL', false, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'number');
		}
		else if (identifier === 'true') {
			this.tokens.push(new Token('TK_BOOL', true, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'number');
		}
		else {
			this.tokens.push(new Token('TK_IDENTIFIER', identifier, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'identifier');
		}
	}

	tokenize() {
		this.advance();
		while (!this.is_EOF()) {
			this.last_pos.copy(this.current_pos);
			// space
			if (this.current === ' ') {
				this.advance();
				this.syntaxhighlightstr += '&nbsp;';
			}
			// space
			else if (this.current === '\t') {
				// this.tokens.push(new Token("TK_TAB", "\t", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '\t';
			}
			// newline
			else if (this.current === '\n') {
				// this.tokens.push(new Token("TK_NEWLINE", "\n", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '\n';
			}
			else if (this.current === ',') {
				this.tokens.push(new Token("TK_COMMA", ",", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += ',';
			}
			else if (this.current === '.') {
				this.tokens.push(new Token("TK_DOT", ".", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '.';
			}
			else if (this.current === '"') {
				this.get_String();
			}
			else if (this.current === '#') {
				this.get_ID();
			}
			else if (this.current === '\'') {
				this.get_String2();
			}
			// + - -> * /
			else if (this.current === '+') {
				this.tokens.push(new Token("TK_ADD", "+", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += this.tint('+', 'operator')
			}
			else if (this.current === '-') {
				// ->
				if (this.peek() === '>') {
					this.advance();
					this.tokens.push(new Token("TK_TO", "->", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += '->'
				}
				// -
				else {
					this.tokens.push(new Token("TK_MINUS", "-", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += this.tint('-', 'operator')
				}
				this.advance();
			}
			else if (this.current === '*') {
				this.tokens.push(new Token("TK_MULTIPIY", "*", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += this.tint('%', 'operator')
			}
			else if (this.current === '/') {
				this.tokens.push(new Token("TK_DIVIDE", "/", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += this.tint('%', 'operator')
			}
			else if (this.current === '%') {
				this.tokens.push(new Token("TK_MOD", "%", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += this.tint('%', 'operator')
			}
			else if (this.current === '^') {
				this.tokens.push(new Token("TK_POW", "^", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += this.tint('^', 'operator')
			}
			else if (this.current === ':') {
				this.tokens.push(new Token("TK_TYPEDEFINE", ":", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += ':'
			}
			else if (this.current === '=') {
				// ===
				if (this.peek() === '=') {
					this.advance();
					this.tokens.push(new Token("TK_EQUAL", "==", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += this.tint('==', 'operator')
				}
				// =
				else {
					this.tokens.push(new Token("TK_ASSIGN", "=", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += this.tint('=', 'operator')
				}
				this.advance();
			}

			else if (this.current === '[') {
				this.tokens.push(new Token("TK_LSQR", "[", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '['
			}
			else if (this.current === ']') {
				this.tokens.push(new Token("TK_RSQR", "]", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += ']'
			}
			else if (this.current === '(') {
				this.tokens.push(new Token("TK_LCIR", "(", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '('
			}
			else if (this.current === ')') {
				this.tokens.push(new Token("TK_RCIR", ")", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += ')'
			}
			else if (this.current === '<') {
				// ===
				if (this.peek() === '=') {
					this.advance();
					this.tokens.push(new Token("TK_LESSE", "<=", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += '&lt;='
				}
				// =
				else {
					this.tokens.push(new Token("TK_LESS", "<", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += '&lt;'
				}
				this.advance();
			}
			else if (this.current === '>') {
				// ===
				if (this.peek() === '=') {
					this.advance();
					this.tokens.push(new Token("TK_GREATERE", ">=", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += '&gt;='
				}
				// =
				else {
					this.tokens.push(new Token("TK_GREATER", ">", this.last_pos, this.current_pos));
					this.syntaxhighlightstr += '&gt;'
				}
				this.advance();
			}
			else if (this.current === '{') {
				this.tokens.push(new Token("TK_LBRACE", "{", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '{'
			}
			else if (this.current === '}') {
				this.tokens.push(new Token("TK_RBRACE", "}", this.last_pos, this.current_pos));
				this.advance();
				this.syntaxhighlightstr += '}'
			}
			else if (this.current === '!') {
				// !=
				if (this.peek() === '=') {
					this.tokens.push(new Token("TK_NOTEQUAL", "!=", this.last_pos, this.current_pos));
					this.advance();
					this.syntaxhighlightstr += this.tint('!=', 'operator')
				}
				else {
					let character = "";
					character += this.current;
					this.errors.push(new BaseError("InvalidCharError", character, this.last_pos, this.current_pos));
					this.syntaxhighlightstr += '!'
				}
				this.advance();
			}
			// number
			else if (this.is_NumberChar(this.current)) {
				this.get_Number();
			}
			// identifier
			else if (this.is_IdentifierChar(this.current)) {
				this.get_Identifier();
			}
			else {
				let character = "";
				character += this.current;
				this.syntaxhighlightstr += character
				this.errors.push(new BaseError("InvalidCharError", character, this.last_pos, this.current_pos));
				this.advance();
			}
		}

		this.tokens.push(new Token("TK_EOF", "EOF", this.current_pos, this.current_pos));
	}
}

export const SunDesignExpressionParser = new Language("sundesignexp", {
	'array': () => {
		return new ChooseOne([
			new Match([
				new MatchToken('TK_LSQR'),
				new MatchToken('TK_RSQR')
			], () => { return ['array', { type: 'array', list: [] }] }),
			new Match([
				new MatchToken('TK_LSQR'),
				new MatchTerm('expression'),
				new More_or_None([
					new Match([
						new MatchToken("TK_COMMA"),
						new MatchTerm('expression')
					], (match, token) => {
						return match.nodes[0]
					})
				], (match, token) => {
					return ['explist', match.nodes]
				}),
				new MatchToken('TK_RSQR')
			], (match, token) => {
				let list = []
				// console.log(">>> tuple", match.nodes)
				if (match.nodes[0])
					list = [match.nodes[0][1]]
				if (match.nodes[1] && match.nodes[1][0] === "explist") {
					match.nodes[1][1].forEach((i) => {
						list.push(i[1])
					})
				}
				return ['array', { type: 'array', list: list }]
			})
		])
	},
	'func': () => {
		return new Match([
			new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['value', { type: 'identifier', value: token.value }] }),
			new Once_or_None([
				new ChooseOne([
					new Match([
						new MatchToken('TK_LCIR'),
						new MatchToken('TK_RCIR')
					], () => { return ['array', { type: 'array', list: [] }] }),
					new Match([
						new MatchToken('TK_LCIR'),
						new MatchTerm('expression'),
						new More_or_None([
							new Match([
								new MatchToken("TK_COMMA"),
								new MatchTerm('expression')
							], (match, token) => {
								return match.nodes[0]
							})
						], (match, token) => {
							return ['explist', match.nodes]
						}),
						new MatchToken('TK_RCIR')
					], (match, token) => {
						let list = []
						if (match.nodes[0])
							list = [match.nodes[0][1]]
						if (match.nodes[1] && match.nodes[1][0] === "explist") {
							match.nodes[1][1].forEach((i) => {
								list.push(i[1])
							})
						}
						return ['array', { type: 'array', list: list }]
					})
				])
			])
		], (match, token) => {
			if (match.nodes.length === 1)
				return match.nodes[0]
			return ['func', { type: 'func', identifier: match.nodes[0][1], arguments: match.nodes[1][1].list }]

		})
	},
	'base': () => {
		return new ChooseOne([
			new MatchToken("TK_INT", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'int' }, value: token.value }] }),
			new MatchToken("TK_FLOAT", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'float' }, value: token.value }] }),
			new MatchToken("TK_STRING", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'string' }, value: token.value }] }),
			new MatchToken("TK_BOOL", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'bool' }, value: token.value }] }),
			new MatchTerm('array'),
			new MatchTerm('func'),
			new Match([
				new MatchToken("TK_LCIR", undefined, (match, token) => { return ["lcir", token] }),
				new MatchTerm('expression'),
				new MatchToken("TK_RCIR", undefined, (match, token) => { return ["rcir", token] }),
			], (match, token) => {
				// console.log(match.nodes)
				match.nodes[1][1].$end = match.nodes[2][1].$end
				match.nodes[1][1].$endidx = match.nodes[2][1].$endidx
				match.nodes[1][1].$start = match.nodes[0][1].$start
				match.nodes[1][1].$startidx = match.nodes[0][1].$startidx
				return match.nodes[1]
			}),
			new Match([
				new MatchToken("TK_ID", undefined, (match, token) => { return ['value', { type: 'id', value: token.value }] }),
				new MatchToken("TK_DOT", undefined),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['value', { type: 'property', value: token.value }] }),
			], (match, token) => {
				return ['noderef', {
					type: 'noderef',
					id: match.nodes[0][1],
					identifier: match.nodes[1][1],
				}]
			})
		])
	},
	"facter": () => {
		return new Match([
			new Once_or_None([new ChooseOne([
				new MatchToken("TK_ADD", undefined, (match, token) => { return ['type', { op: "+" }] }),
				new MatchToken("TK_MINUS", undefined, (match, token) => { return ['type', { op: "-" }] }),
				new MatchToken("TK_KEYWORD", 'not', (match, token) => { return ['type', { op: "!" }] }),
			])]),
			new MatchTerm('base')
		], (match, token) => {
			if (match.nodes[0] && match.nodes[1])
				return ['uniop', { type: 'uniop', value: match.nodes[0][1].op, sub: [match.nodes[1][1]] }]
			else {
				return match.nodes[0]
			}
		})
	},
	"dot": () => {
		return new Match([
			new MatchTerm('facter'),
			new More_or_None([
				new Match([
					new MatchToken("TK_DOT", undefined, (match, token) => { return ['op', { op: "." }] }),
					new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['value', { type: 'property', value: token.value }] }),
				], (match, token) => { return ['dot', match.nodes] })
			], (match, token) => { return ['binoptree', match.nodes] })
		], (match, token) => {
			let tree = match.nodes[1][1];
			let sub = match.nodes[0][1];
			let node = sub;
			if (tree.length === 0) {
				return match.nodes[0];
			}
			tree.forEach((op) => {
				let value = op[1][1][1];
				node = { type: 'dot', value: op[1][0][1].op, sub: [sub, value], $start: sub.$start, $startidx: sub.$startidx, $end: value.$end, $endidx: value.$endidx };
				sub = node;
			})
			return ['dot', node]
		})
	},
	"slice": () => {
		return new Match([
			new MatchTerm('dot'),
			new More_or_None([
				new Match([
					new MatchToken('TK_LSQR', undefined),
					new MatchTerm("expression"),
					// new ChooseOne([
					// 	new MatchToken("TK_INT", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'int' }, value: token.value }] }),
					// 	new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['value', { type: 'identifier', value: token.value }] }),
					// ]),
					new MatchToken('TK_RSQR', undefined, (match, token) => { return ['rsqr', { type: 'tmp' }] })
				], (match, token) => { return ['binop', match.nodes] })
			], (match, token) => { return ['binoptree', match.nodes] })
		], (match, token) => {
			let tree = match.nodes[1][1];
			let sub = match.nodes[0][1];
			let node = sub;
			if (tree.length === 0) {
				return match.nodes[0];
			}
			tree.forEach((op) => {
				let value = op[1][0][1];
				let rsqr = op[1][1][1];
				node = { type: 'binop', value: "[]", sub: [sub, value], $start: sub.$start, $startidx: sub.$startidx, $end: rsqr.$end, $endidx: rsqr.$endidx };
				sub = node;
			})
			return ['binop', node]
		})
	},
	"term": () => {
		return new Match([
			new MatchTerm('slice'),
			new More_or_None([
				new Match([
					new ChooseOne([
						new MatchToken("TK_MULTIPIY", undefined, (match, token) => { return ['op', { op: "*" }] }),
						new MatchToken("TK_DIVIDE", undefined, (match, token) => { return ['op', { op: "/" }] }),
						new MatchToken("TK_MOD", undefined, (match, token) => { return ['op', { op: "%" }] }),
						new MatchToken("TK_POW", undefined, (match, token) => { return ['op', { op: "^" }] }),
					]),
					new MatchTerm('slice')
				], (match, token) => { return ['binop', match.nodes] })
			], (match, token) => { return ['binoptree', match.nodes] })
		], (match, token) => {
			let tree = match.nodes[1][1];
			let sub = match.nodes[0][1];
			let node = sub;
			if (tree.length === 0) {
				return match.nodes[0];
			}
			tree.forEach((op) => {
				let value = op[1][1][1];
				node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value], $start: sub.$start, $startidx: sub.$startidx, $end: value.$end, $endidx: value.$endidx };
				sub = node;
			})
			return ['binop', node]
		})
	},
	"operation": () => {
		return new Match([
			new MatchTerm('term'),
			new More_or_None([
				new Match([
					new ChooseOne([
						new MatchToken("TK_ADD", undefined, (match, token) => { return ['op', { op: "+" }] }),
						new MatchToken("TK_MINUS", undefined, (match, token) => { return ['op', { op: "-" }] }),
					]),
					new MatchTerm('term')
				], (match, token) => { return ['binop', match.nodes] })
			], (match, token) => { return ['binoptree', match.nodes] })
		], (match, token) => {
			let tree = match.nodes[1][1];
			let sub = match.nodes[0][1];
			let node = sub;
			if (tree.length === 0) {
				return match.nodes[0];
			}
			tree.forEach((op) => {
				let value = op[1][1][1];
				node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value], $start: sub.$start, $startidx: sub.$startidx, $end: value.$end, $endidx: value.$endidx };
				sub = node;
			})
			return ['binop', node]
		})
	},
	"compare": () => {
		return new Match([
			new MatchTerm('operation'),
			new More_or_None([
				new Match([
					new ChooseOne([
						new MatchToken("TK_EQUAL", undefined, (match, token) => { return ['op', { op: "==" }] }),
						new MatchToken("TK_NOTEQUAL", undefined, (match, token) => { return ['op', { op: "!=" }] }),
						new MatchToken("TK_LESS", undefined, (match, token) => { return ['op', { op: "<" }] }),
						new MatchToken("TK_GREATER", undefined, (match, token) => { return ['op', { op: ">" }] }),
						new MatchToken("TK_LESSE", undefined, (match, token) => { return ['op', { op: "<=" }] }),
						new MatchToken("TK_GREATERE", undefined, (match, token) => { return ['op', { op: ">=" }] }),
					]),
					new MatchTerm('operation')
				], (match, token) => { return ['binop', match.nodes] })
			], (match, token) => { return ['binoptree', match.nodes] })
		], (match, token) => {
			let tree = match.nodes[1][1];
			let sub = match.nodes[0][1];
			let node = sub;
			if (tree.length === 0) {
				return match.nodes[0];
			}
			tree.forEach((op) => {
				let value = op[1][1][1];
				node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value], $start: sub.$start, $startidx: sub.$startidx, $end: value.$end, $endidx: value.$endidx };
				sub = node;
			})
			return ['binop', node]
		})
	},
	"logic": () => {
		return new Match([
			new MatchTerm('compare'),
			new More_or_None([
				new Match([
					new ChooseOne([
						new MatchToken("TK_KEYWORD", 'and', (match, token) => { return ['op', { op: "&&" }] }),
						new MatchToken("TK_KEYWORD", 'or', (match, token) => { return ['op', { op: "||" }] }),
					]),
					new MatchTerm('compare')
				], (match, token) => { return ['binop', match.nodes] })
			], (match, token) => { return ['binoptree', match.nodes] })
		], (match, token) => {
			let tree = match.nodes[1][1];
			let sub = match.nodes[0][1];
			let node = sub;
			if (tree.length === 0) {
				return match.nodes[0];
			}
			tree.forEach((op) => {
				let value = op[1][1][1];
				node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value], $start: sub.$start, $startidx: sub.$startidx, $end: value.$end, $endidx: value.$endidx };
				sub = node;
			})
			return ['binop', node]
		})
	},
	"expression": () => {
		return new MatchTerm('logic')
	},
}, 'expression')

const ALL_TYPE = ['int', 'float', 'bool', 'string', 'vec2']
const BASE_TYPE = ['int', 'float', 'bool', 'string']

export const SunDesignExpressionPrelude = {
	FUNCS: {
		range: [{
			inputs: [{
				type: "datatype",
				datatype: "base",
				value: "int"
			}],
			export: [{
				type: 'datatype',
				datatype: 'arraytype',
				count: null,
				value: {
					type: 'datatype',
					datatype: 'base',
					value: 'int'
				}
			}, "range"]
		}],
		switch: [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$any"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$any"
					}
				],
				export: (type_1, type_2, type_3) => {
					if (typeCheck(type_3, type_2, { array_ignore_length: true })) {
						if (type_2.datatype === 'arraytype' && type_3.count !== type_2.count) {
							const type = cloneType(type_3)
							type.count = null
							return [type, "switch"]
						}
						return [cloneType(type_3), "switch"]
					}
					return [null, `switch(_, a, b) requires 'a' and 'b' have the same type`]
				}
			}
		],
		valid: [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$any"
				}
				],
				export: [{
					type: 'datatype',
					datatype: 'base',
					value: 'bool'
				}, "valid"]
			}
		],
		int: [{
			inputs: [{
				type: 'datatype',
				datatype: 'base',
				value: '$number'
			}],
			export: [{
				type: 'datatype',
				datatype: 'base',
				value: 'int'
			}, "cast_int"]
		}],
		"[]": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "arraytype",
						count: null,
						value: {
							type: "datatype",
							datatype: "base",
							value: "$any"
						}
					}, {
						type: "datatype",
						datatype: "base",
						value: "int"
					}
				],
				export: (type_1, type_2) => {
					return [cloneType(type_1.value), "array_take"]
				}
			}
		],
		"+": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					if (type_1.value === 'float' || type_2.value === 'float') {
						return [{
							type: "datatype",
							datatype: "base",
							value: "float"
						}, "$keep"]
					}
					return [{
						type: "datatype",
						datatype: "base",
						value: "int"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, "addVec2"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "addVec3"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "string"
				}, "$keep"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1) => {
					return [cloneType(type_1), "$pass"]
				}
			}
		],
		"-": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					if (type_1.value === 'float' || type_2.value === 'float') {
						return [{
							type: "datatype",
							datatype: "base",
							value: "float"
						}, "$keep"]
					}
					return [{
						type: "datatype",
						datatype: "base",
						value: "int"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, "minusVec2"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "minusVec3"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1) => {
					return [cloneType(type_1), "$keep"]
				}
			}
		],
		"*": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					if (type_1.value === 'float' || type_2.value === 'float') {
						return [{
							type: "datatype",
							datatype: "base",
							value: "float"
						}, "$keep"]
					}
					return [{
						type: "datatype",
						datatype: "base",
						value: "int"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, "multScalerVec2_0"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, "multScalerVec2"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "multScalerVec3_0"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "multScalerVec3"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "multVec3Vec3"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "mat4"
					}, {
						type: "datatype",
						datatype: "base",
						value: "mat4"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, "multMat4"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "mat4"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "multMat4Vec3"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, "multVec2Vec2"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "multVec3Vec3"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "quat"
					}, {
						type: "datatype",
						datatype: "base",
						value: "quat"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "quat"
				}, "multQuatQuat"]
			},
		],
		"/": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "float"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, "divScalerVec2"]
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "divScalerVec3"]
			}
		],
		"%": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "float"
					}, "$keep"]
				}
			}
		],
		"^": [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, "$keep"]
			}, {
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec2"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, "dotVec2Vec2"]
			}, {
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}, {
						type: "datatype",
						datatype: "base",
						value: "vec3"
					}
				],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, "dotVec3Vec3"]
			},
		],
		// "==": [{
		//     inputs: [
		//         {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }, {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }
		//     ],
		//     export: (type_1, type_2) => {
		//         if (typeCheck(type_1, type_2)) {
		//             if (type_1.datatype === 'base' && BASE_TYPE.includes.type_1.value) {
		//                 return [{
		//                     type: "datatype",
		//                     datatype: "base",
		//                     value: "bool"
		//                 }, "$keep"]
		//             }
		//             return [{
		//                 type: "datatype",
		//                 datatype: "base",
		//                 value: "bool"
		//             }, "cmp_eq"]
		//         }
		//         return [null, "operator a == b requires a and b have the same type"]
		//     }
		// }],
		// ">": [{
		//     inputs: [
		//         {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }, {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }
		//     ],
		//     export: (type_1, type_2) => {
		//         if (typeCheck(type_1, type_2)) {
		//             if (type_1.datatype === 'base' && BASE_TYPE.includes.type_1.value) {
		//                 return [{
		//                     type: "datatype",
		//                     datatype: "base",
		//                     value: "bool"
		//                 }, "$keep"]
		//             }
		//             return [{
		//                 type: "datatype",
		//                 datatype: "base",
		//                 value: "bool"
		//             }, "cmp_g"]
		//         }
		//         return [null, "operator a > b requires a and b have the same type"]
		//     }
		// }],
		// "<": [{
		//     inputs: [
		//         {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }, {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }
		//     ],
		//     export: (type_1, type_2) => {
		//         if (typeCheck(type_1, type_2)) {
		//             if (type_1.datatype === 'base' && BASE_TYPE.includes.type_1.value) {
		//                 return [{
		//                     type: "datatype",
		//                     datatype: "base",
		//                     value: "bool"
		//                 }, "$keep"]
		//             }
		//             return [{
		//                 type: "datatype",
		//                 datatype: "base",
		//                 value: "bool"
		//             }, "cmp_l"]
		//         }
		//         return [null, "operator a < b requires a and b have the same type"]
		//     }
		// }],
		// ">=": [{
		//     inputs: [
		//         {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }, {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }
		//     ],
		//     export: (type_1, type_2) => {
		//         if (typeCheck(type_1, type_2)) {
		//             if (type_1.datatype === 'base') {
		//                 return [{
		//                     type: "datatype",
		//                     datatype: "base",
		//                     value: "bool"
		//                 }, "$keep"]
		//             }
		//             return [{
		//                 type: "datatype",
		//                 datatype: "base",
		//                 value: "bool"
		//             }, "cmp_eq_g"]
		//         }
		//         return [null, "operator a >= b requires a and b have the same type"]
		//     }
		// }],
		// "<=": [{
		//     inputs: [
		//         {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }, {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }
		//     ],
		//     export: (type_1, type_2) => {
		//         if (typeCheck(type_1, type_2)) {
		//             if (type_1.datatype === 'base') {
		//                 return [{
		//                     type: "datatype",
		//                     datatype: "base",
		//                     value: "bool"
		//                 }, "$keep"]
		//             }
		//             return [{
		//                 type: "datatype",
		//                 datatype: "base",
		//                 value: "bool"
		//             }, "cmp_eq_l"]
		//         }
		//         return [null, "operator a <= b requires a and b have the same type"]
		//     }
		// }],
		// "!=": [{
		//     inputs: [
		//         {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }, {
		//             type: "datatype",
		//             datatype: "base",
		//             value: "$any"
		//         }
		//     ],
		//     export: (type_1, type_2) => {
		//         if (typeCheck(type_1, type_2)) {
		//             if (type_1.datatype === 'base') {
		//                 return [{
		//                     type: "datatype",
		//                     datatype: "base",
		//                     value: "bool"
		//                 }, "$keep"]
		//             }
		//             return [{
		//                 type: "datatype",
		//                 datatype: "base",
		//                 value: "bool"
		//             }, "cmp_neq"]
		//         }
		//         return [null, "operator a != b requires a and b have the same type"]
		//     }
		// }],
		"&&": [{
			inputs: [
				{
					type: "datatype",
					datatype: "base",
					value: "bool"
				}, {
					type: "datatype",
					datatype: "base",
					value: "bool"
				}
			],
			export: [{
				type: "datatype",
				datatype: "base",
				value: "bool"
			}, "$keep"]
		}],
		"||": [{
			inputs: [
				{
					type: "datatype",
					datatype: "base",
					value: "bool"
				}, {
					type: "datatype",
					datatype: "base",
					value: "bool"
				}
			],
			export: [{
				type: "datatype",
				datatype: "base",
				value: "bool"
			}, "$keep"]
		}],
		"!": [{
			inputs: [
				{
					type: "datatype",
					datatype: "base",
					value: "bool"
				}
			],
			export: [{
				type: "datatype",
				datatype: "base",
				value: "bool"
			}, "$keep"]
		}],
		//
		'==': [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "bool"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			}
		],
		'!=': [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "bool"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			}
		],
		'>': [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "bool"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			}
		],
		'>=': [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "bool"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			}
		],
		'<': [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "bool"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			}
		],
		'<=': [
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "$number"
					}, {
						type: "datatype",
						datatype: "base",
						value: "$number"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "string"
					}, {
						type: "datatype",
						datatype: "base",
						value: "string"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			},
			{
				inputs: [
					{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, {
						type: "datatype",
						datatype: "base",
						value: "bool"
					}
				],
				export: (type_1, type_2) => {
					return [{
						type: "datatype",
						datatype: "base",
						value: "bool"
					}, "$keep"]
				}
			}
		],
		//
		"vec2": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, 'makeVec2_0']
			},
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec2"
				}, "makeVec2"]
			}
		],
		"vec3": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, 'makeVec3_0']
			},
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, "makeVec3"]
			}
		],
		"euler": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "euler"
				}, "makeEuler"]
			}
		],
		// Quaternion
		"quat": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "quat"
				}, "makeQuat"]
			}
		],
		"mat4": [
			{
				inputs: [],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Identity']
			},
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				},],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4']
			},
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, {
					type: "datatype",
					datatype: "base",
					value: "quat"
				}, {
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4PosQuatScale']
			}
		],
		"color": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "color"
				}, "makeColorRGB"]
			}
		],
		"basis": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, {
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}, {
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Basis']
			},
		],
		"translate": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Translate']
			},
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Translate_0']
			},
		],
		"scale": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "vec3"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Scale']
			},
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Scale_0']
			}
		],
		"rotate": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "euler"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Rotate']
			},
		],
		"rotateX": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4RotateX']
			},
		],
		"rotatey": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4RotateY']
			},
		],
		"rotateZ": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4RotateZ']
			},
		],
		"shear": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}, {
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "mat4"
				}, 'makeMat4Shear']
			}
		],
		"sin": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, 'sin']
			},
		],
		"cos": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, 'cos']
			},
		],
		"tan": [
			{
				inputs: [{
					type: "datatype",
					datatype: "base",
					value: "$number"
				}],
				export: [{
					type: "datatype",
					datatype: "base",
					value: "float"
				}, 'tan']
			},
		],
	},
	STRUCTS: {
		vec2: {
			x: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec2X"],
			y: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec2Y"],
			length: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec2Length"],
			normal: [{
				type: "datatype",
				datatype: "base",
				value: "vec2"
			}, "getVec2Normal"]
		},
		vec3: {
			x: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec3X"],
			y: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec3Y"],
			z: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec3Z"],
			length: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getVec3Length"],
			normal: [{
				type: "datatype",
				datatype: "base",
				value: "vec3"
			}, "getVec3Normal"]
		},
		euler: {
			x: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getEulerX"],
			y: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getEulerY"],
			z: [{
				type: "datatype",
				datatype: "base",
				value: "float"
			}, "getEulerZ"],
			quat: [{
				type: "datatype",
				datatype: "base",
				value: "quat"
			}, "getEulerQuat"]
		},
		mat4: {
			translate: [{
				type: "datatype",
				datatype: "base",
				value: "vec3"
			}, "getMat4Translate"],
			rotate: [{
				type: "datatype",
				datatype: "base",
				value: "quat"
			}, "getMat4Rotate"],
			scale: [{
				type: "datatype",
				datatype: "base",
				value: "vec3"
			}, "getMat4Scale"],
			inverse: [{
				type: "datatype",
				datatype: "base",
				value: "mat4"
			}, "getMat4Invert"],
		},
		quat: {
			inverse: [{
				type: "datatype",
				datatype: "base",
				value: "quat"
			}, "getQuatInvert"],
			euler: [{
				type: "datatype",
				datatype: "base",
				value: "euler"
			}, "getQuatEuler"],
		},
		$array: {
			size: [{
				type: "datatype",
				datatype: "base",
				value: "int"
			}, "getArraySize"],
		}
	}
}

export const SunDesignExpressionConstants = {
	PI: {
		instance() {
			return {
				type: 'value',
				value: Math.PI,
				datatype: {
					type: 'datatype',
					datatype: 'base',
					value: 'float'
				},
				constant: true
			}
		}
	},
	TAU: {
		instance() {
			return {
				type: 'value',
				value: Math.PI * 2,
				datatype: {
					type: 'datatype',
					datatype: 'base',
					value: 'float'
				},
				constant: true
			}
		}
	}
}

export const SunDesignExpressionVisitor = function (prelude = SunDesignExpressionPrelude, inputs, nodes) {
	const FUNCS = prelude.FUNCS ?? {}
	const STRUCTS = prelude.STRUCTS ?? {}
	const INPUTS = inputs ?? {
		test: {
			type: "datatype",
			datatype: 'base',
			value: 'int'
		},
		testarr: {
			type: "datatype",
			datatype: 'arraytype',
			count: null,
			value: {
				type: "datatype",
				datatype: 'base',
				value: 'int'
			}
		}
	}
	const NODES = nodes ?? {
		param: {
			bool_arr: {
				"type": "datatype",
				"datatype": "arraytype",
				"count": null,
				"value": {
					"type": "datatype",
					"datatype": "base",
					"value": "bool"
				}
			}
		}
	}
	const CONSTANTS = SunDesignExpressionConstants
	function has_Func(iden) {
		return FUNCS[iden] !== undefined
	}
	function match_Func(iden, datatypes) {
		if (FUNCS[iden] === undefined) return [null, null]
		const func = FUNCS[iden]
		for (let i of func) {
			const matched = typeCheck({
				type: "datatype",
				datatype: "tupletype",
				list: i.inputs
			}, {
				type: "datatype",
				datatype: "tupletype",
				list: datatypes
			})
			if (matched) {
				if (i.export instanceof Function) {
					return i.export(...datatypes)
				}
				return [cloneType(i.export[0]), i.export[1]]
			}
		}
		return [null, null]
	}
	function match_Dot(datatype, iden) {
		if (datatype.datatype === 'arraytype') datatype = {
			type: 'datatype',
			datatype: 'base',
			value: '$array'
		}
		if (datatype.datatype !== 'base') return [null, null]
		if (STRUCTS[datatype.value] === undefined) return [null, null]
		if (STRUCTS[datatype.value][iden] === undefined) return [null, null]
		const [type, func] = STRUCTS[datatype.value][iden]
		return [cloneType(type), func ?? "$dot"]
	}
	function match_Inputs(iden) {
		if (INPUTS[iden] === undefined) return null
		return cloneType(INPUTS[iden])
	}
	function has_Node(iden) {
		return iden in NODES
	}
	function match_Node(id, iden) {
		const node = NODES[id];
		if (iden in node) {
			return [true, node[iden]]
		}
		else return [false, null]
	}
	return {
		binop: {
			walk(node, path) {
				return ["sub"]
			},
			transform(path) {
				const node = path.node
				const iden = node.value
				const datatypes = node.sub.map(s => s.datatype)
				const [ans, func] = match_Func(iden, datatypes)
				if (ans === null) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					let [left_str, left_starter, left_end] = path.$sourcescript.get_ScriptPortion(node.sub[0].$start, node.sub[0].$end, "~")
					let [right_str, right_starter, right_end] = path.$sourcescript.get_ScriptPortion(node.sub[1].$start, node.sub[1].$end, "~")
					let left = left_str + `${left_starter}${left_end}type of ${typeToString(datatypes[0])}`
					let right = right_str + `${right_starter}${right_end}type of ${typeToString(datatypes[1])}`
					return [node, new BaseError("Function Not Found", `\n${left}\n\n${right}\n\ntry to call function ${iden} with argumants (${datatypes.map(d => typeToString(d)).join(", ")})${func === null ? '' : `\n${func}`}`, node.$start, node.$end)]
				}
				node.datatype = ans
				node.func = func
				const map = {
					"^": "**"
				}
				if (node.func !== '$keep' && node.func !== '$pass') {
					node.arguments = node.sub
					delete node.sub
					node.type = 'func'
				}
				return node
			}
		},
		uniop: {
			walk(node, path) {
				return ["sub"]
			},
			transform(path) {
				const node = path.node
				const iden = node.value
				const datatypes = node.sub.map(s => s.datatype)
				const [ans, func] = match_Func(iden, datatypes)
				if (ans === null) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					let [left_str, left_starter, left_end] = path.$sourcescript.get_ScriptPortion(node.sub[0].$start, node.sub[0].$end, "~")
					let left = left_str + `${left_starter}${left_end}type of ${typeToString(datatypes[0])}`
					return [node, new BaseError("Function Not Found", `\n${left}\n\ntry to call function ${iden} with argumants (${datatypes.map(d => typeToString(d)).join(", ")})${func === null ? '' : `\n${func}`}`, node.$start, node.$end)]
				}
				node.datatype = ans
				node.func = func
				if (node.func !== '$keep' && node.func !== '$pass') {
					node.arguments = node.sub
					delete node.sub
					node.type = 'func'
				}
				return node
			}
		},
		func: {
			walk(node, path) {
				return ["arguments"]
			},
			transform(path) {
				const node = path.node
				const iden = node.identifier.value
				const datatypes = node.arguments.map(s => s.datatype)
				if (!has_Func(iden)) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					let [left_str, left_starter, left_end] = path.$sourcescript.get_ScriptPortion(node.identifier.$start, node.identifier.$end, "~")
					return [node, new BaseError("Function Not Found", `\n${left_str}\nfunction ${iden} is not defined`, node.$start, node.$end)]
				}
				const [ans, func] = match_Func(iden, datatypes)
				if (ans === null) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					return [node, new BaseError("Function Not Found", `\ntry to call function ${iden} with argumants (${datatypes.map(d => typeToString(d)).join(", ")})${func === null ? '' : `\n${func}`}`, node.$start, node.$end)]
				}
				node.datatype = ans
				node.func = func
				return node
			}
		},
		dot: {
			walk(node, path) {
				return ["sub"]
			},
			transform(path) {
				const node = path.node
				const iden = node.sub[1].value
				const datatype = node.sub[0].datatype
				const [ans, func] = match_Dot(datatype, iden)
				if (ans === null) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					let [left_str, left_starter, left_end] = path.$sourcescript.get_ScriptPortion(node.sub[0].$start, node.sub[0].$end, "~")
					let [right_str, right_starter, right_end] = path.$sourcescript.get_ScriptPortion(node.sub[1].$start, node.sub[1].$end, "~")
					let left = left_str + `${left_starter}${left_end}type of ${typeToString(datatype)}`
					let right = right_str
					return [node, new BaseError("Property Not Found", `\n${left}\n\n${right}\nproperty ${iden} is not found in type ${typeToString(datatype)}`, node.$start, node.$end)]
				}
				node.datatype = ans
				node.func = func
				return node
			}
		},
		value: {
			walk(node, path) {
			},
			transform(path) {
				path.node.constant = true
				return path.node
			}
		},
		identifier: {
			walk(node, path) {
				// check exists
			},
			transform(path) {
				const node = path.node
				const ans = match_Inputs(node.value)
				const constant = CONSTANTS[node.value]
				if (ans === null) {
					if (constant === undefined) {
						node.datatype = {
							type: "datatype",
							datatype: "base",
							value: "$unknown"
						}
						return [node, new BaseError("Input Not Found", `input ${node.value} is not defined`, node.$start, node.$end)]
					}
					else {
						const node2 = constant.instance()
						node2.$start = node.$start
						node2.$startidx = node.$startidx
						node2.$end = node.$end
						node2.$endidx = node.$endidx
						return node2
					}
				}
				else if (constant !== undefined) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					return [node, new BaseError("Input Definination Error", `${node.value} is a built-in constant, try use another input name`, node.$start, node.$end)]
				}
				// deps.push(node.value)
				node.datatype = ans
				return path.node
			}
		},
		noderef: {
			walk(node, path) {
				// check exists
			},
			transform(path) {
				const node = path.node
				const id = node.id.value
				const iden = node.identifier.value
				const ans = has_Node(id)
				if (ans) {
					const [ans, datatype] = match_Node(id, iden)
					if (!ans) {
						node.constant = false
						node.datatype = {
							type: "datatype",
							datatype: "base",
							value: "$unknown"
						}
						let [left_str, left_starter, left_end] = path.$sourcescript.get_ScriptPortion(node.identifier.$start, node.identifier.$end, "~")
						return [node, new BaseError("ExportProperty Not Found", `\n${left_str}\nexport property '${id}' cannot be found in node #${id}`, node.$start, node.$end)]
					}
					node.datatype = datatype
					node.constant = false
					node.id = id
					node.identifier = iden
					node.func = 'getExportProperty'
					return path.node
				}
				else {
					node.constant = false
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					let [left_str, left_starter, left_end] = path.$sourcescript.get_ScriptPortion(node.id.$start, node.id.$end, "~")
					return [node, new BaseError("Node Not Found", `\n${left_str}\nnode with id '${id}' cannot be found in the current scope`, node.$start, node.$end)]
				}
			}
		},
		array: {
			walk(node, path) {
				return ["list"]
			},
			transform(path) {
				const node = path.node
				const datatypes = node.list.map(i => i.datatype)

				if (datatypes.length === 0) {
					node.datatype = {
						type: "datatype",
						datatype: "base",
						value: "$unknown"
					}
					return [node, new BaseError("Array Define Error", `\nthis array contains nothing`, path.$start, path.$end)]
				}
				const matchtype = datatypes[0]
				let flag = true
				for (let i = 1; i < datatypes.length; i++) {
					if (typeCheck(matchtype, datatypes[i])) { }
					else {
						flag = false
						break
					}
				}
				if (!flag) {
					node.datatype = {
						type: 'datatype',
						datatype: 'arraytype',
						count: datatypes.length,
						value: {
							type: "datatype",
							datatype: "base",
							value: "$unknown"
						}
					}
					let reasons = node.list.map((s, i) => {
						let [str, starter, end] = path.$sourcescript.get_ScriptPortion(s.$start, s.$end, "~")
						return str + `${starter}${end}type of ${typeToString(s.datatype)}`
					})
					return [node, new BaseError("Array Types Error", `\n${reasons.join("\n")}\n\nan array can only contain value with the same type`, path.$start, path.$end)]
					// return [node, new BaseError("Input Not Found", `\ninput ${node.value} is not defined`, node.$start, node.$end)]
				}
				node.datatype = {
					type: 'datatype',
					datatype: 'arraytype',
					count: datatypes.length,
					value: cloneType(matchtype)
				}
				return path.node
			}
		}
	}
}

class TypeCheckPass {
	constructor() {
		this.walker = new Walker(null, null, null, null, true)
	}

	walk(source, ast, inputs, nodes) {
		this.walker.error = []
		this.walker.ast = ast
		this.walker.sourcescript = source
		this.walker.visitors = SunDesignExpressionVisitor(SunDesignExpressionPrelude, inputs, nodes)
		return this.walker.walk(ast)
	}
}

export const SunDesignExpressionTypeCheckPass = new TypeCheckPass()

const create_Node = {
	value: (value, type, constant) => {
		return {
			type: 'value',
			datatype: {
				type: 'datatype',
				datatype: 'base',
				value: type
			},
			value: value,
			constant: constant ?? true
		}
	}
}

function clone_Node(node) {
	return { ...node }
}

const SunDesignExpressionOptimizations = {
	BINOP: {
		"+": (left, right) => { return left + right },
		"-": (left, right) => { return left - right },
		"*": (left, right) => { return left * right },
		"/": (left, right) => {
			if (right === 0) {
				throw new BaseError("Divider Zero Error", `0(Zero) is used as the divider which will cause NaN error`)
			}
			return left / right
		},
		"%": (left, right) => { return left % right },
		"^": (left, right) => { return left ** right },
		"&&": (left, right) => { return left && right },
		"||": (left, right) => { return left || right },

		"==": (left, right) => { return left === right },
		"!=": (left, right) => { return left !== right },
		">": (left, right) => { return left > right },
		">=": (left, right) => { return left >= right },
		"<": (left, right) => { return left < right },
		"<=": (left, right) => { return left <= right },
	},
	UNIOP: {
		"+": (left) => { return left },
		"-": (left) => { return -left },
		"!": (left) => { return !left },
	},
	FUNCS: {
		cast_int: (arg1) => Math.floor(arg1.value),
		valid: (arg1) => (arg1 !== undefined),
		// vec2
		addVec2: (arg1, arg2) => {
			return OptVector2.add(arg1.value, arg2.value)
		},
		minusVec2: (arg1, arg2) => {
			return OptVector2.minus(arg1.value, arg2.value)
		},
		dotVec2Vec2: (arg1, arg2) => {
			return OptVector2.dot(arg1.value, arg2.value)
		},
		multVec2Vec2: (arg1, arg2) => {
			return OptVector2.cross(arg1.value, arg2.value)
		},
		// vec3
		addVec3: (arg1, arg2) => {
			return OptVector3.add(arg1.value, arg2.value)
		},
		minusVec3: (arg1, arg2) => {
			return OptVector3.minus(arg1.value, arg2.value)
		},
		dotVec3Vec3: (arg1, arg2) => {
			return OptVector2.dot(arg1.value, arg2.value)
		},
		multVec3Vec3: (arg1, arg2) => {
			return OptVector2.cross(arg1.value, arg2.value)
		},

		// quat
		multQuatQuat: (quat1, quat2) => {
			return OptQuaternion.multiply(quat1.value, quat2.value)
		},

		// math
		sin: (arg1) => Math.sin(arg1.value),
		cos: (arg1) => Math.cos(arg1.value),
		tan: (arg1) => Math.tan(arg1.value),
	},
	NOTCONSTANTFUNCS: {
		"*": ([const1, const2], [arg1, arg2]) => {
			if (const1 && arg1.value === 0) return arg1
			if (const2 && arg2.value === 0) return arg2
			if (const1 && arg1.value === 1) return arg2
			if (const2 && arg2.value === 1) return arg1
		},
		"+": ([const1, const2], [arg1, arg2]) => {
			if (const1 && arg1.value === 0) return arg2
			if (const2 && arg2.value === 0) return arg1
		},
		"-": ([const1, const2], [arg1, arg2]) => {
			if (const2 && arg2.value === 0) return arg1
		},
		"/": ([const1, const2], [arg1, arg2]) => {
			if (const2 && arg2.value === 1) return arg1
		},
		"&&": ([const1, const2], [arg1, arg2]) => {
			if (const1 && !arg1.value) return create_Node.value(false, 'bool')
			if (const1 && arg1.value) return arg2
			if (const2 && !arg2.value) return create_Node.value(false, 'bool')
			if (const2 && arg2.value) return arg1
		},
		"||": ([const1, const2], [arg1, arg2]) => {
			if (const1 && arg1.value) return create_Node.value(true, 'bool')
			if (const1 && !arg1.value) return arg2
			if (const2 && arg2.value) return create_Node.value(true, 'bool')
			if (const2 && !arg2.value) return arg1
		},
		switch: (constants, args) => {
			const [test_const, _1, _2] = constants
			const [test, arg1, arg2] = args
			if (test_const === true) {
				// console.log(test, arg1, arg2)
				return test.value ? arg1 : arg2
			}
			return
		},
		// vec2
		makeVec2_0: ([constant], [arg1]) => {
			const vec2 = new OptVector2(
				clone_Node(arg1),
				clone_Node(arg1),
			)
			return create_Node.value(
				vec2,
				'vec2',
				vec2.constant
			)
		},
		makeVec2: ([const1, const2], [arg1, arg2]) => {
			const vec2 = new OptVector2(
				clone_Node(arg1),
				clone_Node(arg2),
			)
			return create_Node.value(
				vec2,
				'vec2',
				vec2.constant
			)
		},
		multScalerVec2: ([const1, const2], [vec, scaler]) => {
			if (const1 && const2) {
				if (vec.value.constant) {
					const val = scaler.value
					vec.value.multScaler(val)
					return vec
				}
			}
			if (const2 && scaler.value === 0) {
				vec.constant = true
				vec.value = new OptVector2(create_Node.value(0, 'float', true), create_Node.value(0, 'float', true))
				return vec
			}
			if (const2 && scaler.value === 1) {
				return vec
			}
		},
		multScalerVec2_0: ([const1, const2], [scaler, vec]) => {
			if (const1 && const2) {
				if (vec.value.constant) {
					const val = scaler.value
					vec.value.multScaler(val)
					return vec
				}
			}
			if (const1 && scaler.value === 0) {
				vec.constant = true
				vec.value = new OptVector2(create_Node.value(0, 'float', true), create_Node.value(0, 'float', true))
				return vec
			}
			if (const1 && scaler.value === 1) {
				return vec
			}
		},
		// vec3
		makeVec3_0: ([constant], [arg1]) => {
			const vec3 = new OptVector3(
				clone_Node(arg1),
				clone_Node(arg1),
				clone_Node(arg1),
			)
			return create_Node.value(
				vec3,
				'vec3',
				vec3.constant
			)
		},
		makeVec3: ([const1, const2, const3], [arg1, arg2, arg3]) => {
			const vec3 = new OptVector3(
				clone_Node(arg1),
				clone_Node(arg2),
				clone_Node(arg3),
			)
			return create_Node.value(
				vec3,
				'vec3',
				vec3.constant
			)
		},
		multScalerVec3: ([const1, const2], [vec, scaler]) => {
			if (const1 && const2) {
				if (vec.value.constant) {
					const val = scaler.value
					vec.value.multScaler(val)
					return vec
				}
			}
			if (const2 && scaler.value === 0) {
				vec.constant = true
				vec.value = new OptVector3(create_Node.value(0, 'float', true), create_Node.value(0, 'float', true), create_Node.value(0, 'float', true))
				return vec
			}
			if (const2 && scaler.value === 1) {
				return vec
			}
		},
		multScalerVec3_0: ([const1, const2], [scaler, vec]) => {
			if (const1 && const2) {
				if (vec.value.constant) {
					const val = scaler.value
					vec.value.multScaler(val)
					return vec
				}
			}
			if (const1 && scaler.value === 0) {
				vec.constant = true
				vec.value = new OptVector3(create_Node.value(0, 'float', true), create_Node.value(0, 'float', true), create_Node.value(0, 'float', true))
				return vec
			}
			if (const1 && scaler.value === 1) {
				return vec
			}
		},
		// euler
		makeEuler: ([const1, const2, const3], [arg1, arg2, arg3]) => {
			const euler = new OptEuler(
				clone_Node(arg1),
				clone_Node(arg2),
				clone_Node(arg3),
			)
			return create_Node.value(
				euler,
				'euler',
				euler.constant
			)
		},
		// quat
		makeQuat: ([const1, const2, const3, const4], [arg1, arg2, arg3, arg4]) => {
			const quat = new OptQuaternion(
				clone_Node(arg1),
				clone_Node(arg2),
				clone_Node(arg3),
				clone_Node(arg4),
			)
			return create_Node.value(
				quat,
				'quat',
				quat.constant
			)
		},
		// mat4
		makeMat4: (constarr, [n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44]) => {
			const mat4 = new OptMatrix4(
				clone_Node(n11),
				clone_Node(n12),
				clone_Node(n13),
				clone_Node(n14),
				clone_Node(n21),
				clone_Node(n22),
				clone_Node(n23),
				clone_Node(n24),
				clone_Node(n31),
				clone_Node(n32),
				clone_Node(n33),
				clone_Node(n34),
				clone_Node(n41),
				clone_Node(n42),
				clone_Node(n43),
				clone_Node(n44),
			)
			return create_Node.value(
				mat4,
				'mat4',
				mat4.constant
			)
		},
		// array
		array_take: ([const1, const2], [arr, idx]) => {
			if (const2 && (arr.datatype.count !== null && arr.datatype.count !== undefined)) {
				const i = idx.value
				if (i < 0 || i >= arr.datatype.count) throw new BaseError("Array Access Error", `${idx.value} is out of bound, should be in [0, ${arr.datatype.count})`, idx.$start, idx.$end)
			}
			if (const1 && const2) {
				return arr.list[idx.value]
			}
		},
	},
	STRUCTS: {
		// vec2
		getVec2X: (constant, args) => {
			return args.value.getX()
		},
		getVec2Y: (constant, args) => {
			return args.value.getY()
		},
		getVec2Normal: (constant, arg1) => {
			if (constant) {
				const norm = arg1.value.normalized()
				if (norm === undefined) {
					throw new BaseError("Divider Zero Error", `0(Zero) is used as the divider which will cause NaN error`, arg1.$start, arg1.$end)
				}
				return create_Node.value(norm, 'vec2')
			}
		},
		getVec2Length: (constant, args) => {
			if (constant) {
				if (args.value.constant) {
					const ans = args.value.length()
					return create_Node.value(ans, 'float')
				}
			}
		},
		// vec3
		getVec3X: (constant, args) => {
			return args.value.getX()
		},
		getVec3Y: (constant, args) => {
			return args.value.getY()
		},
		getVec3Z: (constant, args) => {
			return args.value.getZ()
		},
		getVec3Normal: (constant, arg1) => {
			if (constant) {
				const norm = arg1.value.normalized()
				if (norm === undefined) {
					throw new BaseError("Divider Zero Error", `0(Zero) is used as the divider which will cause NaN error`, arg1.$start, arg1.$end)
				}
				return create_Node.value(norm, 'vec3')
			}
		},
		getVec3Length: (constant, args) => {
			if (constant) {
				if (args.value.constant) {
					const ans = args.value.length()
					return create_Node.value(ans, 'float')
				}
			}
		},
		// euler
		getEulerX: (constant, args) => {
			return args.value.getX()
		},
		getEulerY: (constant, args) => {
			return args.value.getY()
		},
		getEulerZ: (constant, args) => {
			return args.value.getZ()
		},
		// euler
		getEulerQuat: (constant, euler) => {
			if (constant) {
				const quat = OptEuler.toQuaternion(euler.value)
				return create_Node.value(quat, 'quat')
			}
		},
		// quat
		getQuatInvert: (constant, args) => {
			if (constant) {
				const invert = OptQuaternion.invert(args.value)
				return create_Node.value(invert, 'quat')
			}
		},
		getQuatEuler: (constant, quat) => {
			if (constant) {
				const euler = OptQuaternion.toEuler(quat.value)
				return create_Node.value(euler, 'euler')
			}
		},
	}
}

export const SunDesignOptimizationPassVisitor = {
	dot: {
		walk() { return ["sub"] },
		transform(path) {
			try {
				const node = path.node
				const [left, property] = node.sub
				const func = node.func
				if (left.type === 'value' && SunDesignExpressionOptimizations.STRUCTS[func] !== undefined) {
					let ans = SunDesignExpressionOptimizations.STRUCTS[func](left.constant, left)
					if (ans === undefined) return node
					ans.datatype = ans.datatype ?? node.datatype
					ans = {
						...ans,
						$start: node.$start,
						$startidx: node.$startidx,
						$end: node.$end,
						$endidx: node.$endidx,
					}
					return ans
				}
				else {
					return node
				}
			}
			catch (err) {
				console.log(err)
				err.set_Portion(path.$start, path.$end)
				return [path.node, err]
			}
		}
	},
	binop: {
		walk() { return ["sub"] },
		transform(path) {
			try {
				const node = path.node
				const [left, right] = node.sub
				const func = node.func === '$keep' || node.func === '$pass' ? node.value : node.func
				if (left.constant && right.constant) {
					if (SunDesignExpressionOptimizations.BINOP[func] !== undefined) {
						const val = SunDesignExpressionOptimizations.BINOP[func](left.value, right.value)
						return {
							type: 'value',
							value: val,
							constant: true,
							datatype: node.datatype,
							$start: node.$start,
							$startidx: node.$startidx,
							$end: node.$end,
							$endidx: node.$endidx,
						}
					}
				}
				else {
					if (SunDesignExpressionOptimizations.NOTCONSTANTFUNCS[func] !== undefined) {
						const ans = SunDesignExpressionOptimizations.NOTCONSTANTFUNCS[func]([left.constant, right.constant], [left, right])
						if (ans === undefined) return node
						ans.datatype = ans.datatype ?? node.datatype
						return ans
					}
				}
				return node
			}
			catch (err) {
				err.set_Portion(path.$start, path.$end)
				return [path.node, err]
			}
		}
	},
	uniop: {
		walk() { return ["sub"] },
		transform(path) {
			try {
				const node = path.node
				const [left] = node.sub
				if (left.constant) {
					const func = node.func === '$keep' || node.func === '$pass' ? node.value : node.func
					if (SunDesignExpressionOptimizations.UNIOP[func] !== undefined) {
						const val = SunDesignExpressionOptimizations.UNIOP[func](left.value)
						return {
							type: 'value',
							value: val,
							constant: true,
							datatype: node.datatype,
							$start: node.$start,
							$startidx: node.$startidx,
							$end: node.$end,
							$endidx: node.$endidx,
						}
					}
				}
				else {
					return node
				}
			}
			catch (err) {
				err.set_Portion(path.$start, path.$end)
				return [path.node, err]
			}
		}
	},
	func: {
		walk() { return ["arguments"] },
		transform(path) {
			try {
				const node = path.node
				const constant = node.arguments.reduce((last, i) => {
					if (i.constant === true) return last
					return false
				}, true)
				const func = node.func
				if (constant && SunDesignExpressionOptimizations.FUNCS[func] !== undefined) {
					const ans = SunDesignExpressionOptimizations.FUNCS[func](...node.arguments)
					const val = ans
					const constant = null
					if (ans instanceof Array) {
						val = ans[0]
						constant = ans[1]
					}
					return {
						type: 'value',
						value: val,
						constant: constant ?? true,
						datatype: node.datatype,
						$start: node.$start,
						$startidx: node.$startidx,
						$end: node.$end,
						$endidx: node.$endidx,
					}
				}
				else {
					if (SunDesignExpressionOptimizations.NOTCONSTANTFUNCS[func] !== undefined) {
						let ans = SunDesignExpressionOptimizations.NOTCONSTANTFUNCS[func](node.arguments.map(a => a.constant), node.arguments)
						if (ans === undefined) return node
						ans.datatype = ans.datatype ?? node.datatype
						ans = {
							...ans,
							$start: node.$start,
							$startidx: node.$startidx,
							$end: node.$end,
							$endidx: node.$endidx,
						}
						return ans
					}
				}
				return node
			}
			catch (err) {
				console.error(err)
				err.set_Portion(path.$start, path.$end)
				return [path.node, err]
			}
		}
	},
	array: {
		walk() { return ["list"] },
		transform(path) {
			const node = path.node
			const constant = node.list.reduce((last, i) => {
				if (i.constant === true) return last
				return false
			}, true)
			if (constant)
				node.constant = true
			return node
		}
	}
}

class OptVector2 {
	constructor(x, y) {
		this.x = x
		this.y = y
		this.constant = x.constant && y.constant ? true : false
	}

	multScaler(s) {
		if (!this.constant) return
		this.x.value *= s
		this.y.value *= s
	}

	length() {
		if (!this.constant) return
		return Math.sqrt(this.x.value ** 2 + this.y.value ** 2)
	}

	normalized() {
		if (!this.constant) return
		const len = this.length()
		if (len === 0) return
		return new OptVector2(create_Node.value(this.x.value / len, 'float'), create_Node.value(this.y.value / len, 'float'))
	}

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	static add(a, b) {
		if (a.constant && b.constant) {
			return new OptVector2(create_Node.value(a.x.value + b.x.value, 'float'), create_Node.value(a.y.value + b.y.value, 'float'))
		}
	}

	static minus(a, b) {
		if (a.constant && b.constant) {
			return new OptVector2(create_Node.value(a.x.value - b.x.value, 'float'), create_Node.value(a.y.value - b.y.value, 'float'))
		}
	}

	static dot(a, b) {
		if (a.constant && b.constant) {
			return a.x.value * b.x.value + a.y.value * b.y.value
		}
	}

	static cross(a, b) {
		if (a.constant && b.constant) {
			return a.x.value * b.y.value - a.y.value * b.x.value
		}
	}
}

class OptVector3 {
	constructor(x, y, z) {
		this.x = x
		this.y = y
		this.z = z
		this.constant = x.constant && y.constant && z.constant ? true : false
	}

	multScaler(s) {
		if (!this.constant) return
		this.x.value *= s
		this.y.value *= s
		this.z.value *= s
	}

	length() {
		if (!this.constant) return
		return Math.sqrt(this.x.value ** 2 + this.y.value ** 2 + this.z.value ** 2)
	}

	normalized() {
		if (!this.constant) return
		const len = this.length()
		if (len === 0) return
		return new OptVector3(create_Node.value(this.x.value / len, 'float'), create_Node.value(this.y.value / len, 'float'), create_Node.value(this.z.value / len, 'float'))
	}

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	getZ() {
		return this.z
	}

	toTHREEVector3() {
		if (this.constant) {
			const x = this.x.value
			const y = this.y.value
			const z = this.z.value
			return new Vector3(x, y, z)
		}
	}

	static toOptVector3(vec3) {
		return new OptVector3(create_Node.value(vec3.x, 'float'), create_Node.value(vec3.y, 'float'), create_Node.value(vec3.z, 'float'))
	}

	static add(a, b) {
		if (a.constant && b.constant) {
			return new OptVector3(create_Node.value(a.x.value + b.x.value, 'float'), create_Node.value(a.y.value + b.y.value, 'float'), create_Node.value(a.z.value + b.z.value, 'float'))
		}
	}

	static minus(a, b) {
		if (a.constant && b.constant) {
			return new OptVector3(create_Node.value(a.x.value - b.x.value, 'float'), create_Node.value(a.y.value - b.y.value, 'float'), create_Node.value(a.z.value - b.z.value, 'float'))
		}
	}

	static dot(a, b) {
		if (a.constant && b.constant) {
			return a.x.value * b.x.value + a.y.value * b.y.value + a.z.value * b.z.value
		}
	}

	static cross(a, b) {
		if (a.constant && b.constant) {
			return new OptVector3(
				create_Node.value(a.y.value * b.z.value - a.z.value * b.y.value, 'float'),
				create_Node.value(a.z.value * b.x.value - a.x.value * b.z.value, 'float'),
				create_Node.value(a.x.value * b.y.value - a.y.value * b.x.value, 'float'))
		}
	}
}

class OptEuler {
	constructor(x, y, z) {
		this.x = x
		this.y = y
		this.z = z
		this.constant = x.constant && y.constant && z.constant ? true : false
	}

	multScaler(s) {
		if (!this.constant) return
		this.x.value *= s
		this.y.value *= s
		this.z.value *= s
	}

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	getZ() {
		return this.z
	}

	toTHREEEuler() {
		if (this.constant) {
			const x = this.x.value
			const y = this.y.value
			const z = this.z.value
			return new Euler(x, y, z)
		}
	}

	static toOptEuler(euler) {
		return new OptEuler(create_Node.value(euler.x, 'float'), create_Node.value(euler.y, 'float'), create_Node.value(euler.z, 'float'))
	}

	static add(a, b) {
		if (a.constant && b.constant) {
			return new OptVector3(create_Node.value(a.x.value + b.x.value, 'float'), create_Node.value(a.y.value + b.y.value, 'float'), create_Node.value(a.z.value + b.z.value, 'float'))
		}
	}

	static toQuaternion(a) {
		if (a.constant) {
			const x = a.x.value
			const y = a.y.value
			const z = a.z.value
			const euler = new Euler(x, y, z)
			const quat = new Quaternion().setFromEuler(euler)
			return new OptQuaternion(create_Node.value(quat.x, 'float'), create_Node.value(quat.y, 'float'), create_Node.value(quat.z, 'float'), create_Node.value(quat.w, 'float'))
		}
	}
}

class OptQuaternion {
	constructor(x, y, z, w) {
		this.x = x
		this.y = y
		this.z = z
		this.w = w
		this.constant = x.constant && y.constant && z.constant && w.constant ? true : false
	}

	multScaler(s) {
		if (!this.constant) return
		this.x.value *= s
		this.y.value *= s
		this.z.value *= s
	}

	getX() {
		return this.x
	}

	getY() {
		return this.y
	}

	getZ() {
		return this.z
	}

	toTHREEQuaternion() {
		if (this.constant) {
			const x = this.x.value
			const y = this.y.value
			const z = this.z.value
			const w = this.w.value
			return new Quaternion(x, y, z, w)
		}
	}

	static toOptQuaternion(quat) {
		return new OptEuler(create_Node.value(quat.x, 'float'), create_Node.value(quat.y, 'float'), create_Node.value(quat.z, 'float'), create_Node.value(quat.w, 'float'))
	}

	static invert(a) {
		if (a.constant) {
			const x = a.x.value
			const y = a.y.value
			const z = a.z.value
			const w = a.w.value
			const quat = new Quaternion(x, y, z, w).invert()
			return new OptQuaternion(create_Node.value(quat.x, 'float'), create_Node.value(quat.y, 'float'), create_Node.value(quat.z, 'float'), create_Node.value(quat.w, 'float'))
		}
	}

	static multiply(a, b) {
		if (a.constant && b.constant) {
			const x1 = a.x.value
			const y1 = a.y.value
			const z1 = a.z.value
			const w1 = a.w.value
			const x2 = b.x.value
			const y2 = b.y.value
			const z2 = b.z.value
			const w2 = b.w.value
			const quat1 = new Quaternion(x1, y1, z1, w1)
			const quat2 = new Quaternion(x2, y2, z2, w2)
			const quat = new Quaternion().multiplyQuaternions(quat1, quat2)
			return new OptQuaternion(create_Node.value(quat.x, 'float'), create_Node.value(quat.y, 'float'), create_Node.value(quat.z, 'float'), create_Node.value(quat.w, 'float'))
		}
	}

	static toEuler(a) {
		if (a.constant) {
			const x = a.x.value
			const y = a.y.value
			const z = a.z.value
			const w = a.w.value
			const quat = new Quaternion(x, y, z, w)
			const euler = new Euler().setFromQuaternion(quat)
			return new OptEuler(create_Node.value(euler.x, 'float'), create_Node.value(euler.y, 'float'), create_Node.value(euler.z, 'float'))
		}
	}
}

class OptMatrix4 {
	constructor(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
		this.n11 = n11
		this.n12 = n12
		this.n13 = n13
		this.n14 = n14
		this.n21 = n21
		this.n22 = n22
		this.n23 = n23
		this.n24 = n24
		this.n31 = n31
		this.n32 = n32
		this.n33 = n33
		this.n34 = n34
		this.n41 = n41
		this.n42 = n42
		this.n43 = n43
		this.n44 = n44
		this.constant = n11.constant && n12.constant && n13.constant && n14.constant && n21.constant && n22.constant && n23.constant && n24.constant && n31.constant && n32.constant && n33.constant && n34.constant && n41.constant && n42.constant && n43.constant && n44.constant ? true : false
	}

	toTHREEMatrix4() {
		if (this.constant) {
			const n11 = n11.value
			const n12 = n12.value
			const n13 = n13.value
			const n14 = n14.value
			const n21 = n21.value
			const n22 = n22.value
			const n23 = n23.value
			const n24 = n24.value
			const n31 = n31.value
			const n32 = n32.value
			const n33 = n33.value
			const n34 = n34.value
			const n41 = n41.value
			const n42 = n42.value
			const n43 = n43.value
			const n44 = n44.value
			const mat4 = new Matrix4()
			mat4.set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44)
			return mat4;
		}
	}

	static toOptMatrix4(mat4) {
		const t = mat4.clone().transpose()
		const array = []
		t.toArray(array)
		return new OptMatrix4(...array.map(
			val =>
				create_Node.value(val, 'float')
		))
	}

	// Warning !!!! ==> b * a
	static multiply(a, b) {
		if (a.constant && b.constant) {
			const mata = a.toTHREEMatrix4()
			const matb = b.toTHREEMatrix4()
			const mat = new Matrix4().multiplyMatrices(matb, mata)
			return OptMatrix4.toOptMatrix4(mat)
		}
	}
}

class OptimizationPass {
	constructor() {
		this.walker = new Walker(null, SunDesignOptimizationPassVisitor, null, null, true)
	}

	walk(source, ast) {
		this.walker.error = []
		this.walker.ast = ast
		this.walker.sourcescript = source
		return this.walker.walk(ast)
	}
}

export const SunDesignExpressionOptimizationPass = new OptimizationPass()

export const SunDesignCodeGenPassVisitor = {
	range: (val) => {
		return `(()=>{const a = [];for(let i = 0; i < ${val}; i++) a.push(i);return a;})()`
	},
	cast_int: (val) => `Math.floor(${val})`,
	sin: (val) => `Math.sin(${val})`,
	cos: (val) => `Math.cos(${val})`,
	tan: (val) => `Math.tan(${val})`,
	valid: (val) => `(${val} !== undefined)`,
	int: (val) => val.toString(),
	bool: (val) => val.toString(),
	float: (val) => val.toString(),
	string: (val) => `'${val}'`,
	'+': (a, b) => `(${a} + ${b})`,
	'-': (a, b) => `(${a} - ${b})`,
	'*': (a, b) => `(${a} * ${b})`,
	'/': (a, b) => `(${a} / ${b})`,
	'%': (a, b) => `(${a} % ${b})`,
	'&&': (a, b) => `(${a} && ${b})`,
	'||': (a, b) => `(${a} && ${b})`,
	'!': (a) => `(!${a})`,
	'==': (a, b) => `(${a} === ${b})`,
	'!=': (a, b) => `(${a} !== ${b})`,
	'>': (a, b) => `(${a} > ${b})`,
	'>=': (a, b) => `(${a} >= ${b})`,
	'<': (a, b) => `(${a} < ${b})`,
	'<=': (a, b) => `(${a} <= ${b})`,
	vec2: (val, opt, codegen) => {
		const x = codegen.walk(val.x, opt);
		const y = codegen.walk(val.y, opt);
		return `(new ${opt.THREE}.Vector2(${x}, ${y}))`
	},
	vec3: (val, opt, codegen) => {
		const x = codegen.walk(val.x, opt);
		const y = codegen.walk(val.y, opt);
		const z = codegen.walk(val.z, opt);
		return `(new ${opt.THREE}.Vector3(${x}, ${y}, ${z}))`
	},
	euler: (val, opt, codegen) => {
		const x = codegen.walk(val.x, opt);
		const y = codegen.walk(val.y, opt);
		const z = codegen.walk(val.z, opt);
		return `(new ${opt.THREE}.Euler(${x}, ${y}, ${z}))`
	},
	quat: (val, opt, codegen) => {
		const x = codegen.walk(val.x, opt);
		const y = codegen.walk(val.y, opt);
		const z = codegen.walk(val.z, opt);
		const w = codegen.walk(val.w, opt);
		return `(new ${opt.THREE}.Quaternion(${x}, ${y}, ${z}, ${w}))`
	},
	mat4: (val, opt, codegen) => {
		const n11 = codegen.walk(val.n11, opt);
		const n12 = codegen.walk(val.n12, opt);
		const n13 = codegen.walk(val.n13, opt);
		const n14 = codegen.walk(val.n14, opt);
		const n21 = codegen.walk(val.n21, opt);
		const n22 = codegen.walk(val.n22, opt);
		const n23 = codegen.walk(val.n23, opt);
		const n24 = codegen.walk(val.n24, opt);
		const n31 = codegen.walk(val.n31, opt);
		const n32 = codegen.walk(val.n32, opt);
		const n33 = codegen.walk(val.n33, opt);
		const n34 = codegen.walk(val.n34, opt);
		const n41 = codegen.walk(val.n41, opt);
		const n42 = codegen.walk(val.n42, opt);
		const n43 = codegen.walk(val.n43, opt);
		const n44 = codegen.walk(val.n44, opt);
		return `(new ${opt.THREE}.Matrix4().set(${n11}, ${n12}, ${n13}, ${n14}, ${n21}, ${n22}, ${n23}, ${n24}, ${n31}, ${n32}, ${n33}, ${n34}, ${n41}, ${n42}, ${n43}, ${n44}))`
	},
	makeColorRGB: (val, opt, codegen) => {
		return `(new ${opt.THREE}.Color(${val[0]}, ${val[1]}, ${val[2]}))`
	},
	makeMat4Identity: (val, opt, codegen) => {
		return `(new ${opt.THREE}.Matrix4())`
	},
	switch: (val, opt, codegen) => {
		const [test, a, b] = val
		return `(${test} ? ${a} : ${b})`
		console.log(val, a, b)
	},
	array_take: (val, opt, codegen) => {
		return `${val[0]}[${val[1]}]`
	},

}

class CodeGenPass {
	constructor() { }

	walk(ast, opt) {
		return this[ast.type](ast, opt);
	}

	array(ast, opt) {
		const list = ast.list.map(i => this.walk(i, opt));
		return `[${list.join(', ')}]`;
	}

	value(ast, opt) {
		if (SunDesignCodeGenPassVisitor[ast.datatype.value])
			return SunDesignCodeGenPassVisitor[ast.datatype.value](ast.value, opt, this);
		else
			return this[ast.datatype.value](ast.value, opt, this);
	}

	noderef(ast, opt) {
		opt.ids.add(ast.id)
		return `this.ref('${ast.id}').r.e.${ast.identifier}`;
	}

	func(ast, opt) {
		if (SunDesignCodeGenPassVisitor[ast.func])
			return SunDesignCodeGenPassVisitor[ast.func](ast.arguments.map(a => this.walk(a, opt)), opt, this);
		else
			return `${ast.func}(${ast.arguments.map(a => this.walk(a, opt)).join(', ')})`;
	}

	dot(ast, opt) {
		return `${ast.func}(${this.walk(ast.sub[0], opt)})`;
	}

	uniop(ast, opt) {
		const a = this.walk(ast.sub[0], opt);
		return SunDesignCodeGenPassVisitor[ast.value](a);
	}

	binop(ast, opt) {
		const a = this.walk(ast.sub[0], opt);
		const b = this.walk(ast.sub[1], opt);
		return SunDesignCodeGenPassVisitor[ast.value](a, b);
	}

	property(ast) {
		return ast.value;
	}

	identifier(ast, opt) {
		opt.deps.add(ast.value);
		return opt.INPUTS ? `${opt.INPUTS}.${ast.value}` : ast.value;
	}

	generate(ast, opt = {}) {
		opt = { warnings: [], constant: false, deps: new Set(), ids: new Set(), datatype: { type: 'datatype', datatype: 'base', value: 'unknown' }, THREE: 'THREE', FUNCS: 'FUNCS', INPUTS: 'INPUTS', NODEMAP: {}, ...opt };
		opt.constant = ast.constant ? true : false;
		opt.datatype = ast.datatype ?? opt.datatype;
		opt.ast = ast;
		return [this.walk(ast, opt), opt];
	}
}

export const SunDesignExpressionCodeGenPass = new CodeGenPass()