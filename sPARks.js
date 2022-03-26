export class ScriptPosition {
	constructor(script_name = 'unknown script', line = 0, col = -1) {
		this.line = line;
		this.col = col;
		this.script = script_name;
	}

	next() {
		this.col++;
	}

	newline() {
		this.col = -1;
		this.line++;
	}

	copy(from) {
		this.line = from.line;
		this.col = from.col;
		this.script = from.script;
	}

	clone() {
		return new ScriptPosition(this.script, this.line, this.col);
	}

	toString() {
		return `<${this.script}> ${this.line}:${this.col}`
	}
}

export class SourceScript {
	constructor(script, script_name) {
		this.script = script;
		this.script_name = script_name;
		this.length = script.length;
		this.current = -1;
	}

	get() {
		this.current++;
		if (this.is_EOF()) {
			return '\0';
		}
		return this.script[this.current];
	}

	peek(n = 1) {
		if (this.current + n >= this.length) {
			return '\0';
		}
		return this.script[this.current + n];
	}

	is_EOF() {
		return this.current >= this.length;
	}

	reset() {
		this.current = -1;
	}

	get_ScriptSlice(start, end, ret = true) {
		let linescount = this.script.split('\n').length
		let lines = this.script.split('\n').splice(start, end - start + 1);
		let linecountlen = (linescount).toString().length
		let str = ""//`${start.toString()}:${end.toString()}\n`;

		function match(str, size) {
			let ans = ''
			for (let i = str.length; i < size; i++) {
				ans += ' '
			}
			return ans + str
		}
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			str += `${match((start + i + 1).toString(), linecountlen)} | ${line}${i === lines.length - 1 && !ret ? '' : '\n'}`;
		}

		return str;
	}

	get_ScriptPortion(start, end, linemark = "=", color, ret = true) {
		if (color !== undefined)
			linemark = `<a style='color: ${color};'>${linemark}</a>`
		let linescount = this.script.split('\n').length
		let lines = this.script.split('\n').splice(start.line, end.line - start.line + 1);
		let linecountlen = (linescount).toString().length
		let str = ""//`${start.toString()}:${end.toString()}\n`;

		function match(str, size) {
			let ans = ''
			for (let i = str.length; i < size; i++) {
				ans += ' '
			}
			return ans + str
		}

		let linefront = `${match('', linecountlen)} | `;

		let start_pos = start.col;
		let tokestart = "";
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			str += `${match((start.line + i + 1).toString(), linecountlen)} | ${line}`;
			str += `\n${linefront}`;
			for (let j = 0; j < start_pos; j++) {
				if (line[j] === '\t') {
					str += "\t";
					tokestart += "\t";
				}
				else {
					str += " ";
					tokestart += " ";
				}
			}
			if (i < lines.length - 1) {
				for (let j = start_pos; j < line.length; j++) {
					if (line[j] === '\t') {
						str += "\t"
					}
					else
						str += linemark;
				}
				tokestart = "";
			}
			else {
				for (let j = start_pos; j < end.col + 1; j++) {
					if (line[j] === '\t') {
						str += "\t";
						tokestart += "\t";
					}
					else {
						str += linemark;
						tokestart += " ";
					}
				}
			}
			start_pos = 0;
			if (ret)
				str += '\n';
			else if (i !== lines.length - 1)
				str += '\n';
		}

		return [str, linefront, tokestart];
	}
}

const TOKENS = {
	TK_UNKNOW: "",
	TK_INT: "int",
	TK_FLOAT: "float",
	TK_STRING: "string",
	TK_BOOL: "bool",
	TK_IDENTIFIER: "identifier",
	TK_ID: "id",
	TK_ADD: "+",
	TK_MINUS: "-",
	TK_MULTIPIY: "*",
	TK_DIVIDE: "/",
	TK_MOD: "%",
	TK_DOT: ".",
	TK_LCIR: "(",
	TK_RCIR: ")",
	TK_LSQR: "[",
	TK_RSQR: "]",
	TK_LBRACE: "{",
	TK_RBRACE: "}",
	TK_KEYWORD: "keyword",
	TK_ASSIGN: "=",
	TK_EQUAL: "==",
	TK_NOTEQUAL: "!=",
	TK_LESS: "<",
	TK_GREATER: ">",
	TK_LESSE: "<=",
	TK_GREATERE: ">=",
	TK_TO: "->",
	TK_TYPEDEFINE: ":",
	TK_NEWLINE: "\\n",
	TK_TAB: "\\t",
	TK_COMMA: ",",
	TK_EOF: "EOF"
}

export class Token {
	constructor(type, val, start, end) {
		this.type = type;
		this.value = val;
		if (start)
			this.start = start.clone();
		if (end)
			this.end = end.clone();
	}

	equal(token) {
		return this.type === token.type && this.value === token.value;
	}
}

export class BaseError {
	constructor(type = "Error", msg = "", start, end, info) {
		this.type = type;
		this.message = msg;
		this.start = start?.clone();
		this.end = end?.clone();
		this.info = info;
	}

	set_Portion(start, end) {
		this.start = start.clone();
		this.end = end.clone();
	}
}

export class Lexer {
	constructor(sourcescript) {
		this.sourcescript = sourcescript;
		this.current = '';
		this.current_pos = new ScriptPosition(this.sourcescript.script_name);
		this.last_pos = new ScriptPosition(this.sourcescript.script_name);
		this.tokens = [];
		this.errors = [];
		this.colors = {
			string: '#92C073',
			number: '#D19A63',
			keyword: '#C678DD',
			type: 'tomato',
			identifier: '#E06C75',
			operator: '#53B3C1',
			comment: 'grey',
		};
		this.syntaxhighlightstr = '';
	}

	tint(str, type) {
		return `<span style="color: ${this.colors[type]};">${str}</span>`
	}

	is_EOF() {
		if (this.current === '\0')
			return true;
		else
			return false;
	}

	is_SpaceChar(char) {
		switch (char) {
			case ' ':
			case '\n':
			case '\t':
			case '\r':
			case '\0':
				return true;
		}
		return false;
	}

	is_IdentifierChar(char) {
		const KEY = ("\'\"~!@#$%^&*()+-{}[]\\|;:,.<>?/~`=").split('');
		return !this.is_SpaceChar(char) && !KEY.includes(char);
	}

	is_NumberChar(char) {
		switch (char) {
			case '0':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
				return true;
		}
		return false;
	}

	advance() {
		if (this.sourcescript.is_EOF())
			return;
		this.current = this.sourcescript.get();
		this.current_pos.next();
		if (this.current === '\n')
			this.current_pos.newline();
	}

	peek() {
		return this.sourcescript.peek();
	}

	get_Number() {
		let number = "";
		let dot_count = 0;
		let position = this.current_pos.clone();

		while (!this.is_EOF() && (this.is_NumberChar(this.current) || this.current === '.')) {
			position = this.current_pos.clone();
			if (this.current === '.') {
				if (dot_count === 1)
					break;
				dot_count++;
				number += '.';
			}
			else {
				number += this.current;
			}
			this.advance();
		}

		this.syntaxhighlightstr += this.tint(number, 'number')
		if (dot_count === 0)
			this.tokens.push(new Token('TK_INT', parseInt(number), this.last_pos, position));
		else
			this.tokens.push(new Token('TK_FLOAT', parseFloat(number), this.last_pos, position));
	}

	get_Identifier() {
		let identifier = "";
		let position = this.current_pos.clone();

		while (!this.is_EOF() && this.is_IdentifierChar(this.current)) {
			position = this.current_pos.clone();
			identifier += this.current;
			this.advance();
		}

		const KEYWORD = ["class", "def", "react", "func", "var", "const", "new", "int", "float", "string", "bool", "if", , "elseif", "else", "for", "while", "match", "case", "return", "break", "continue", 'and', 'or', 'not'];



		if (KEYWORD.includes(identifier)) {
			this.tokens.push(new Token('TK_KEYWORD', identifier, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'keyword');
		}
		else if (identifier === 'false') {
			this.tokens.push(new Token('TK_BOOL', identifier, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'number');
		}
		else if (identifier === 'true') {
			this.tokens.push(new Token('TK_BOOL', identifier, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'number');
		}
		else {
			this.tokens.push(new Token('TK_IDENTIFIER', identifier, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(identifier, 'identifier');
		}
	}

	get_String() {
		let str = "";
		let position = this.current_pos.clone();
		this.advance();
		let has_slash = false;
		let ended = false;


		while (!this.is_EOF()) {
			position = this.current_pos.clone();
			if (this.current === '\\') {
				if (has_slash) {
					str += this.current;
					has_slash = false;
				}
				else {
					str += '\\';
					has_slash = true;
				}
			}
			else if (this.current === '"') {
				if (has_slash) {
					str += '"';
					has_slash = false;
				}
				else {
					ended = true;
					this.advance();
					break;
				}
			}
			else {
				has_slash = false;
				if (this.current === '\n')
					// str += '\\n';
					str += '\n';
				else if (this.current === '\t')
					str += '\t';
				else
					str += this.current;
			}
			this.advance();
		}

		if (ended) {
			this.tokens.push(new Token("TK_STRING", str, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(`"${str}"`, 'string');
		}
		else {
			this.errors.push(new BaseError("MissingExpextedError", "\"", this.last_pos, position));
			this.syntaxhighlightstr += this.tint(`"${str}`, 'string');
		}
	}

	get_String2() {
		let str = "";
		let position = this.current_pos.clone();
		this.advance();
		let has_slash = false;
		let ended = false;


		while (!this.is_EOF()) {
			position = this.current_pos.clone();
			if (this.current === '\\') {
				if (has_slash) {
					str += this.current;
					has_slash = false;
				}
				else {
					str += '\\';
					has_slash = true;
				}
			}
			else if (this.current === '\'') {
				if (has_slash) {
					str += '\'';
					has_slash = false;
				}
				else {
					ended = true;
					this.advance();
					break;
				}
			}
			else {
				has_slash = false;
				if (this.current === '\n')
					// str += '\\n';
					str += '\n';
				else if (this.current === '\t')
					str += '\t';
				else
					str += this.current;
			}
			this.advance();
		}

		if (ended) {
			this.tokens.push(new Token("TK_STRING", str, this.last_pos, position));
			this.syntaxhighlightstr += this.tint(`'${str}'`, 'string');
		}
		else {
			this.errors.push(new BaseError("MissingExpextedError", "\'", this.last_pos, position));
			this.syntaxhighlightstr += this.tint(`'${str}`, 'string');
		}
	}

	skip_Comment() {
		let comment = "";

		while (!this.is_EOF() && this.current !== '\n') {
			comment += this.current;
			this.advance();
		}

		this.syntaxhighlightstr += this.tint(comment + '\n', 'comment')
		// LexerCommentError *errorptr = new LexerCommentError(this.last_pos, this.current_pos, comment);
		// this.errors.push(errorptr);
		this.advance();
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
			else if (this.current === '#') {
				this.skip_Comment();
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

Set.prototype.intersect = function (a) {
	return new Set([...a].filter(x => this.has(x)));
}

Set.prototype.difference = function (a) {
	return new Set([...a].filter(x => !this.has(x)));
}

Set.prototype.equal = function (a) {
	return this.difference(a).size === 0 && a.difference(this).size === 0;
}

Array.prototype.in = function (a) {
	for (let idx = 0; idx < this.length; idx++) {
		if (this[idx].equal(a)) return idx;
	}
	return -1;
}

// DFA
export class DFA {
	constructor(start, transform, end) {
		this.path = {

		};
		this.accept = new Set();
		this.start = new Set(start);
		this.end = new Set(end);
		this.states = new Set([...this.start, ...this.end]);
		transform.forEach((t) => {
			this.states.add(t[0]);
			if (this.path[t[0]] === undefined) {
				this.path[t[0]] = {};
			}
			t[1].forEach((i) => {
				if (i[0] !== '$') this.accept.add(i[0]);
				if (this.path[t[0]][i[0]] === undefined) {
					this.path[t[0]][i[0]] = [i[1]];
				}
				else {
					this.path[t[0]][i[0]].push(i[1]);
				}
			})
		})
	}

	$_closure(node) {
		let ans = new Set;
		let nodes;
		if (node instanceof Set || node instanceof Array) {
			nodes = [...node];
		}
		else {
			nodes = [node];
		}
		nodes.forEach(i => ans.add(i));
		let tested = new Set;
		while (nodes.length > 0) {
			let n = nodes.pop();
			tested.add(n);
			if (this.path[n] !== undefined) {
				if (this.path[n]['$'] !== undefined) {
					this.path[n]['$'].forEach((i) => {
						ans.add(i);
						if (!tested.has(i)) {
							nodes.push(i);
						}
					})
				}
			}
		}
		return ans;
	}

	move(node, move) {
		let ans = new Set;
		let nodes;
		if (node instanceof Set || node instanceof Array) {
			nodes = [...node];
		}
		else {
			nodes = [node];
		}
		nodes.forEach((n) => {
			if (this.path[n] !== undefined) {
				if (this.path[n][move] !== undefined) {
					this.path[n][move].forEach((i) => {
						ans.add(i);
					})
				}
			}
		})
		return ans;
	}

	states() {
		let mid = [];
		for (let key in this.path) {
			mid.push(key);
		}
		return Array.from(new Set([...this.start, ...mid, ...this.end]));
	}

	// is_Deterministic() {
	// 	if (this.start.length > 1) return false;
	// 	let ans = true;
	// 	this.path.forEach((p)=>{
	// 		p
	// 	})
	// }

	toString() {
		let str = "graph LR;\n";
		this.end.forEach((s) => {
			str += `  ${s}((${s}))\n`;
		})
		for (let key in this.path) {
			for (let a in this.path[key]) {
				this.path[key][a].forEach((to) => {
					str += `  ${key}--${a === '$' ? 'ɛ' : a}-->${to}\n`
				})
			}
		}
		str += '  $Start((Start))\n';
		this.start.forEach((s) => {
			str += `  $Start-->${s}\n`;
		})

		return str;
	}

	regulate() {
		let table = [this.$_closure(this.start)];
		let count = 0;
		let accept = {};
		for (let i of this.accept) {
			accept[i] = []
		}
		while (count < table.length) {
			for (let i of this.accept) {
				let closure = this.$_closure(this.move(table[count], i));
				// console.log(table, closure)
				if (closure.size === 0) {
					accept[i].push(-1);
					continue;
				}
				let idx = table.in(closure);

				// console.log(idx);
				if (idx === -1) {
					table.push(closure);
					accept[i].push(table.length - 1);
				}
				else
					accept[i].push(idx);
			}
			count++;
		}
		let start = new Set([0]);
		let transform = [];
		let end = new Set;
		console.log(accept)
		table.forEach((s, i) => {
			let path = [];
			this.end.forEach(e => {
				if (s.has(e))
					end.add(i);
			})
			this.accept.forEach(a => {
				if (accept[a][i] === -1) return
				path.push([a, accept[a][i]])
			})
			transform.push([i, path]);
		})
		this.start = start;
		this.end = end;
		this.path = {};
		this.states = new Set([...this.start, ...this.end]);
		transform.forEach((t) => {
			this.states.add(t[0]);
			if (this.path[t[0]] === undefined) {
				this.path[t[0]] = {};
			}
			t[1].forEach((i) => {
				if (i[0] !== '$') this.accept.add(i[0]);
				if (this.path[t[0]][i[0]] === undefined) {
					this.path[t[0]][i[0]] = [i[1]];
				}
				else {
					this.path[t[0]][i[0]].push(i[1]);
				}
			})
		})
	}
}

// sPARks
const TOKEN_CMP = (a, b) => {
	return a.equal(b)
}

Array.prototype.add = function (item, cmpfunc = TOKEN_CMP) {
	for (let i = 0; i < this.length; i++) {
		let ans = cmpfunc(item, this[i]);
		if (ans) return this;
	}
	this.push(item);
	return this;
}

Array.prototype.has = function (item, cmpfunc = TOKEN_CMP) {
	for (let i = 0; i < this.length; i++) {
		let ans = cmpfunc(item, this[i]);
		if (ans) return true;
	}
	return false;
}

Array.prototype.union = function (arr, cmpfunc = TOKEN_CMP) {
	for (let i = 0; i < arr.length; i++) {
		if (!this.has(arr[i], cmpfunc)) this.push(arr[i]);
	}
	return this;
}

export class SPARK_Error {
	constructor(type = "Error", msg = "", idx, last) {
		this.type = type;
		this.message = msg;
		this.start = idx.start.clone();
		this.end = idx.end.clone();
		this.last = last;
	}
}

export class PredictTable {
	constructor(start) {
		this.start = start;
		this.table = {};
		this.accepts = new Set(["TK_EOF"]);
	}

	add(accept, state, to) {
		if (this.table[state] === undefined) {
			this.accepts.add(accept);
			this.table[state] = {
				[accept]: to
			}
		}
		else {
			if (this.table[state][accept] === undefined) {
				this.accepts.add(accept);
				this.table[state][accept] = to;
			}
			else {
				console.log(accept, state, to)
				console.log(this)
				throw new Error("<sPARks> predict table error: language is not LL(1)")
			}
		}
	}

	toTableArray() {
		let ans = [[undefined]];
		this.accepts.forEach((accept) => {
			ans[0].push(`${accept}`);
		})
		for (let key in this.table) {
			let item = [key];
			this.accepts.forEach((accept) => {
				if (this.table[key][accept] === undefined) {
					item.push(undefined);
				}
				else {
					item.push(this.table[key][accept].toString());
				}
			})
			ans.push(item);
		}
		return ans;
	}

	toMDTable() {
		let ans = [[undefined], ["----"]];
		this.accepts.forEach((accept) => {
			ans[0].push(`${accept}`);
			ans[1].push("----");
		})
		for (let key in this.table) {
			let item = [key];
			this.accepts.forEach((accept) => {
				if (this.table[key][accept] === undefined) {
					item.push(undefined);
				}
				else {
					item.push(this.table[key][accept].toString());
				}
			})
			ans.push(item);
		}
		return ans.map((i, idx) => `| ${i.join(" | ")} |`).join("\n");
	}

	match(tokens) {
		let idx = 0;
		let state = this.start;
		let a = tokens[idx];
		let analyze_stack = [new MatchToken("TK_EOF", "EOF"), this.start];
		while (analyze_stack.length > 0) {
			a = tokens[idx];
			console.log(analyze_stack)
			let x = analyze_stack.pop()
			if (x instanceof MatchToken) {
				if (a.type === x.token) {
					// console.log(">>> Match", a, x,)
					idx++;
					continue;
				}
				else {
					// console.log(">>> Match Failed")
					return [false, 0, undefined, new SPARK_Error('TokenUnmatchError', `expected ${TOKENS[x.token] === undefined ? x.token : TOKENS[x.token]}\nbut found ${TOKENS[a.type] === undefined ? a.type : TOKENS[a.type]}`, a, undefined), idx];
				}
			}
			else {
				console.log("is NonTerm: ", x, a, this.table[x][a.type])
				if (this.table[x][a.type] !== undefined) {
					if (this.table[x][a.type] instanceof MatchToken) {
						analyze_stack.push(this.table[x][a.type]);
						continue;
					}
					if (this.table[x][a.type] instanceof MatchTerm) {
						analyze_stack.push(this.table[x][a.type].term_name);
						continue;
					}
					let matchs = this.table[x][a.type].subs.filter(i => true);
					matchs = matchs.reverse();
					matchs.forEach((m) => {
						if (m instanceof MatchToken) {
							analyze_stack.push(m);
						}
						else {
							analyze_stack.push(m.term_name);
						}
					})
				}
				else {
					let ans = [];
					for (let key in this.table[x]) {
						if (TOKENS[key] !== undefined) {
							ans.push(TOKENS[key]);
							continue;
						}
						ans.push(key);
					}
					return [false, 0, undefined, new SPARK_Error('NoMatchingError', `needs\n${ans.map((i) => `\t${i}`).join("\n")}\nbut no valid match`, a, undefined), idx]
				}
			}
		}
		return true;
	}
}

export class Language {
	constructor(name, ebnf, starter, bnf = false) {
		this.name = name;
		this.starter = starter;
		this.$PassChecking = true;
		this.$Terms = {};
		this.$First = {};
		this.$Follow = {};
		this.$Select = {};
		this.$Empty = {};
		for (let key in ebnf) {
			this.registe(key, ebnf[key]);
		}
		this.check();
		if (this.$PassChecking) {
			this.get_Epsilon();
			this.get_First();
			this.get_Follow();
			if (bnf)
				this.get_Select();
		}
	}

	print() {
		console.log(`Language ${this.name}`);
		function get_Front(c) {
			let str = "";
			for (let i = 0; i < c; i++) {
				str += ' ';
			}
			return str;
		}
		let ans = [];
		let size = 0;
		for (let key in this.$Terms) {
			size = Math.max(size, key.length);
		}
		for (let key in this.$Terms) {
			let term = this.$Terms[key]();
			if (term instanceof ChooseOne) {
				ans.push(key + ' ::= ' + term.subs[0].toString());
				term.subs.slice(1, term.length).forEach(s => {
					ans.push(key + ' ::= ' + s.toString());
				})
			}
			else
				ans.push(key + ' ::= ' + term.toString());
		}
		console.log(ans.join("\n"));
	}

	check() {
		for (let key in this.$Terms) {
			try {
				let term = this.$Terms[key]();
				term.check(key, `   *${key}*`, undefined, this);
			}
			catch (err) {
				this.$PassChecking = false;
				console.error(err.message)
			}
		}
	}

	get(term_name) {
		if (this.$Terms[term_name] === undefined) {
			throw Error(`<sPARks> node error: term name "${term_name}" is not defined`);
		}
		else {
			return this.$Terms[term_name]();
		}
	}

	get_Epsilon() {
		let ans = this.$Empty;
		for (let key in this.$Terms) {
			ans[key] = false;
		}
		let changed = true;
		while (changed) {
			changed = false;
			for (let key in this.$Terms) {
				let match = this.get(key);
				let empty = match.get_Epsilon(this);
				if (empty !== ans[key]) {
					ans[key] = empty;
					changed = true;
				}
			}
		}
	}

	get_First() {
		let ans = this.$First;
		for (let key in this.$Terms) {
			ans[key] = [];
		}
		let changed = true;
		while (changed) {
			changed = false;
			for (let key in this.$Terms) {
				let match = this.get(key);
				let [empty, fs] = match.get_First(this);
				let lastlen = ans[key].length;
				ans[key].union(fs);
				if (lastlen !== ans[key].length) {
					changed = true;
				}
			}
			// let str = [];
			// for (let key in this.$Terms) {
			// 	str.push(`${key} -> ${this.$First[key].map(t => t.type)}`)
			// }
			// console.log(str.join("\n"));
		}
	}

	$get_First(match) {
		return match.get_First(this);
	}

	get_Follow() {
		let ans = this.$Follow;
		for (let key in this.$Terms) {
			ans[key] = [];
		}
		ans[this.starter].union([new Token("TK_EOF", "EOF")]);
		let changed = true;
		function change(key, fs) {
			let lastlen = ans[key].length;
			ans[key].union(fs);
			if (lastlen !== ans[key].length) {
				changed = true;
			}
		}
		while (changed) {
			changed = false;
			for (let key in this.$Terms) {
				let match = this.get(key);
				match.get_Follow(key, this, change);
			}
			// let str = [];
			// for (let key in this.$Terms) {
			// 	str.push(`${key} -> ${this.$Follow[key].map(t => t.type)}`)
			// }
			// console.log(str.join("\n"));
		}
	}

	get_Select() {
		for (let key in this.$Terms) {
			this.$Select[key] = [];
		}

		function $get_Select(match, term, l) {
			let [empty, fs] = l.$get_First(match);
			if (empty) {
				fs.union(l.$Follow[term])
			}
			return fs;
		}

		for (let key in this.$Terms) {
			let term = this.get(key);
			if (term instanceof ChooseOne) {
				term.subs.forEach((t) => {
					this.$Select[key].push({ term: t, set: $get_Select(t, key, this) })
				})
			}
			else if (term instanceof Once_or_None || term instanceof More_or_None) {
				if (term.subs instanceof ChooseOne) {
					term.subs.subs.forEach((t) => {
						this.$Select[key].push({ term: t, set: $get_Select(t, key, this) })
					})
				}
				else {
					this.$Select[key].push({ term: term.subs, set: $get_Select(term.subs, key, this) })
				}
				this.$Select[key].push({ term: new Skip(), set: this.$Follow[key] })
			}
			else {
				this.$Select[key].push({ term: term, set: $get_Select(term, key, this) })
			}
		}
	}

	registe(term_name, match) {
		if (this.$Terms[term_name] !== undefined) {
			throw Error(`<sPARks> node error: term name "${term_name}" has been already defined`);
		}
		else {
			this.$Terms[term_name] = match;
			this.$Follow[term_name] = [];
			this.$First[term_name] = [];
			this.$Select[term_name] = [];
			this.$Empty[term_name] = false;
		}
	}

	match(tokens) {
		let term = new Match([
			new MatchTerm(this.starter),
			new MatchToken("TK_EOF")
		], (match) => {
			return match.nodes[0]
		})
		return term.match(tokens, 0, this);
	}

	toLL1Table() {
		let table = new PredictTable(this.starter);
		for (let key in this.$Select) {
			this.$Select[key].forEach((w) => {
				w.set.forEach((accept) => {
					table.add(accept.type, key, w.term);
				})
			})
		}
		return table;
	}

	toLR0Table() {

	}

	toSLR0Table() {

	}
}

export class Match {
	constructor(subs = [], match_func) {
		this.subs = subs;
		if (match_func === undefined) this.match_func = () => { return undefined }
		else this.match_func = typeof (match_func) !== "string" ? match_func : ((match, token) => {
			console.log("Match AST", match.nodes)
			if (match.nodes === undefined || match.nodes.length === 0) return undefined;
			let astnode = {}
			match.nodes.forEach((n) => {
				if (n[1] instanceof Array) {
					if (n[1].length === 0) return;
					console.log(n[1], n[1].map(i => i[1]))
					if (astnode[n[0]] !== undefined) {
						if (astnode[n[0]] instanceof Array)
							astnode[n[0]] = [...astnode[n[0]], ...(n[1].map(i => i[1]))]
						else astnode[n[0]] = [astnode[n[0]], ...(n[1].map(i => i[1]))]
					}
					else {
						astnode[n[0]] = n[1].map(i => i[1])
					}
				}
				else {
					if (astnode[n[0]] !== undefined) {
						throw new Error(`AST Error found dupilcate terms ${match_func}`)
					}
					else
						astnode[n[0]] = n[1]
				}
			})
			return [match_func, astnode]
		})
		this.nodes = [];
	}

	toString() {
		return this.term_name || `${this.subs.map(i => i.toString()).join(' ')}`
	}

	match(tokens, idx = 0, language) {
		let $idx = idx
		this.nodes = [];
		let oldidx = idx;
		let ans, nextidx, node, error, erroridx = undefined;
		for (let i = 0; i < this.subs.length; i++) {
			[ans, nextidx, node, error, erroridx] = this.subs[i].match(tokens, idx, language);
			if (!ans) {
				// console.log(`expected ${this.subs[i].toString()} but found ${tokens[nextidx].value}`)
				return [false, oldidx, undefined, new SPARK_Error('MissingExpectedError', `expected ${this.subs[i].toString()}\nbut found ${tokens[nextidx].value}`, tokens[nextidx], error), erroridx];
			}
			else if (node !== undefined)
				this.nodes.push(node);
			idx = nextidx;
		}
		let ast = this.match_func(this, undefined)
		if (ast !== undefined && (ast[1].$start === undefined && ast[1].$end === undefined) && $idx === idx) {
			ast[1].$start = tokens[$idx].start
			ast[1].$end = tokens[$idx].start
			ast[1].$startidx = $idx
			ast[1].$endidx = $idx
		}
		if (ast !== undefined && (ast[1].$start === undefined && ast[1].$end === undefined)) {
			ast[1].$start = tokens[$idx].start
			ast[1].$end = tokens[idx - 1].end
			ast[1].$startidx = $idx
			ast[1].$endidx = idx - 1
		}
		return [true, idx, ast, undefined, undefined];
	}

	check(term_name, expanded, traveled = [], language) {
		this.subs[0].check(term_name, [expanded, `<Match>\t\t\tfirst of ${this.toString()}`].join(" \n-> "), traveled, language);
	}

	get_Epsilon(language) {
		for (let i = 0; i < this.subs.length; i++) {
			let empty = this.subs[i].get_Epsilon(language);
			if (!empty) return false;
		}
		return true;
	}

	get_First(language) {
		let first = [];
		for (let i = 0; i < this.subs.length; i++) {
			let [empty, fs] = this.subs[i].get_First(language);
			first.union(fs);
			if (!empty) return [false, first];
		}
		return [true, first];
	}

	get_Follow(term_name, language, change) {
		for (let i = 0; i < this.subs.length; i++) {
			let term = this.subs[i];
			if (term instanceof MatchTerm) {
				if (i + 1 >= this.subs.length) {
					change(term.term_name, language.$Follow[term_name]);
				}
				else {
					let beta = new Match(this.subs.slice(i + 1, this.subs.length));
					let [empty, fs] = beta.get_First(language);
					// console.log(term.term_name, this.toString())
					// console.log(beta.toString(), empty, fs)
					if (empty) {
						fs.union(language.$Follow[term_name]);
					}
					change(term.term_name, fs);
				}
			}
		}
	}
}

export class Once_or_None extends Match {
	constructor(subs, returnundefinded = false) {
		super(undefined, undefined);
		if (subs.length === 1) {
			this.subs = subs[0];
			this.returnundefinded = returnundefinded;
		}
		else {
			throw Error('<sPARks> node error: "Once_or_None" node only accept one sub node')
		}
	}

	toString() {
		return `[${this.subs.toString()}]`
	}

	match(tokens, idx = 0, language) {
		let [ans, nextidx, node, error, erroridx] = this.subs.match(tokens, idx, language);
		// if (erroridx > idx) console.log(">>>> error", idx, erroridx, error.message)
		if (ans) {
			return [true, nextidx, node, error, erroridx];
		}
		else if (erroridx > idx) {
			return [false, idx, undefined, error, erroridx]
		}
		return [true, idx, this.returnundefinded ? ['null', null] : undefined, error, erroridx];
	}

	check(term_name, expanded, traveled = [], language) {
		this.subs.check(term_name, [expanded, `<OnceOrNone>\t\t${this.toString()}`].join(" \n-> "), traveled, language);
	}

	get_Epsilon() {
		return true;
	}

	get_First(language) {
		return [true, this.subs.get_First(language)[1]]
	}
}

export class More_or_None extends Match {
	constructor(subs, match_func) {
		let func = typeof (match_func) !== "string" ? match_func : ((match, token) => {
			console.log("More_or_None AST", match.nodes)
			return [match_func, match.nodes]
		})
		super(undefined, func);
		if (subs.length === 1) {
			this.subs = subs[0];
		}
		else {
			throw Error('<sPARks> node error: "More_or_None" node only accept one sub node')
		}
	}

	toString() {
		return `{${this.subs.toString()}}`
	}

	match(tokens, idx = 0, language) {
		let $idx = idx
		this.nodes = [];
		let ans, nextidx = idx, node, error, erroridx = undefined;
		do {
			[ans, nextidx, node, error, erroridx] = this.subs.match(tokens, nextidx, language);
			// if (!ans) console.log(">>>>>>>> error", nextidx, erroridx, error.message)
			if (node !== undefined) {
				this.nodes.push(node);
			}
		} while (ans);

		// console.log(">>>", nextidx, erroridx);

		if (erroridx === nextidx) {
			let ast = this.match_func(this, undefined)
			// if (ast !== undefined) {
			// 	ast[1].$start = tokens[$idx]
			// 	ast[1].$end = tokens[nextidx - 1]
			// 	ast[1].$startidx = $idx
			// 	ast[1].$endidx = nextidx - 1
			// }
			return [true, nextidx, ast, undefined, undefined];
		}
		else {
			let ast = this.match_func(this, undefined)
			// if (ast !== undefined) {
			// 	ast[1].$start = tokens[$idx]
			// 	ast[1].$end = tokens[nextidx - 1]
			// 	ast[1].$startidx = $idx
			// 	ast[1].$endidx = nextidx - 1
			// }
			return [false, nextidx, ast, error, erroridx];
		}
	}

	check(term_name, expanded, traveled = [], language) {
		this.subs.check(term_name, [expanded, `<MoreOrNone>\t\t${this.toString()}`].join(" \n-> "), traveled, language);
	}

	get_Epsilon() {
		return true;
	}

	get_First(language) {
		return [true, this.subs.get_First(language)[1]]
	}
}

export class ChooseOne extends Match {
	constructor(subs, firstmatch = false) {
		super(subs, undefined);
		this.firstmatch = firstmatch;
	}

	toString() {
		return `(${this.subs.map(i => i.toString()).join(' | ')})`
	}

	match(tokens, idx = 0, language) {
		let matched = false
		let last_idx = idx
		let last_error_idx = idx
		let last_node = undefined
		let last_error = undefined
		for (let i = 0; i < this.subs.length; i++) {
			let [ans, nextidx, node, error, erroridx] = this.subs[i].match(tokens, idx, language);
			if (ans) {
				matched = true;
				if (last_idx < nextidx) {
					last_idx = nextidx
					last_node = node
				}
				if (this.firstmatch) {
					return [true, last_idx, last_node, undefined, undefined];
				}
			}
			if (last_error_idx < erroridx) {
				// console.log(">>> error", last_error_idx, erroridx, error.message)
				last_error_idx = erroridx
				last_error = error
			}
		}
		if (matched)
			return [true, last_idx, last_node, undefined, undefined];
		else
			return [false, idx, undefined, new SPARK_Error('NoMatchingError', `needs ${this.toString()}\nbut no valid match`, tokens[last_idx], last_error), last_error_idx];
	}

	check(term_name, expanded, traveled = [], language) {
		this.subs.forEach((s) => {
			s.check(term_name, [expanded, `<ChooseOne>\t\twith ${this.toString()} select ${s.toString()}`].join(" \n-> "), traveled, language);
		})
	}

	get_Epsilon(language) {
		for (let i = 0; i < this.subs.length; i++) {
			let empty = this.subs[i].get_Epsilon(language);
			if (empty) return true;
		}
		return false;
	}

	get_First(language) {
		let first = [];
		let canempty = false;
		for (let i = 0; i < this.subs.length; i++) {
			let [empty, fs] = this.subs[i].get_First(language);
			if (empty) canempty = true;
			first.union(fs);
		}
		return [canempty, first];
	}

	get_Follow(term_name, language, change) {
		for (let i = 0; i < this.subs.length; i++) {
			let term = this.subs[i];
			term.get_Follow(term_name, language, change);
		}
	}
}

export class LLkChooseOne extends Match {
	constructor(subs) {
		super(subs, undefined);
	}

	toString() {
		return `(${this.subs.map(i => i[0].toString() + (i[1] === undefined ? "" : " " + i[1].toString())).join(' | ')})`
	}

	match(tokens, idx = 0, language) {
		for (let i = 0; i < this.subs.length; i++) {
			let [ans, nextidx, node, error, erroridx] = this.subs[i][0].match(tokens, idx, language);
			if (ans) {
				if (this.subs[i][1] === undefined) {
					return [ans, nextidx, node, error, erroridx];
				}
				let [ans2, nextidx2, node2, error2, erroridx2] = this.subs[i][1].match(tokens, nextidx, language);
				if (ans2) {
					return [true, nextidx2, node2, error2, erroridx2];
				}
				else {
					return [false, idx, undefined, new SPARK_Error('NoMatchingError', `found ${this.subs[i][0].toString()} and expected ${this.subs[i][1].toString()}\n but no valid match`, tokens[nextidx2], error2), erroridx2];
				}
			}
		}
		return [false, idx, undefined, new SPARK_Error('NoMatchingError', `needs ${this.toString()}\nbut no valid match`, tokens[idx], undefined), idx];
	}

	check(term_name, expanded, traveled = [], language) {
		this.subs.forEach((s) => {
			s[0].check(term_name, [expanded, `<LLkChooseOne>\t\twith ${this.toString()} select ${s.toString()}`].join(" \n-> "), traveled, language);
		})
	}
}

export class MatchToken extends Match {
	constructor(token, value, match_func) {
		let func = typeof (match_func) !== "string" ? match_func : ((match, token) => {
			console.log("MatchToken AST", match.nodes)
			return [match_func, { type: match_func, datatype: token.type, value: token.value }]
		})
		super(undefined, func);
		this.token = token
		this.value = value
	}

	toString() {
		let token = this.value || TOKENS[this.token] || this.token
		if (['[', ']', '{', '}', '(', ')'].includes(token)) return `'${token}'`
		return token;
	}

	match(tokens, idx = 0, language) {
		let $idx = idx;
		let token = tokens[idx];
		if (token !== undefined) {
			if (token.type === this.token && (this.value === undefined || token.value === this.value)) {
				let ast = this.match_func(this, token)
				if (ast !== undefined && (ast[1].$start === undefined && ast[1].$end === undefined)) {
					ast[1].$start = tokens[$idx].start
					ast[1].$end = tokens[$idx].end
					ast[1].$startidx = $idx
					ast[1].$endidx = $idx
				}
				return [true, idx + 1, ast, undefined, undefined];
			}
			return [false, idx, undefined, new SPARK_Error('TokenUnmatchError', `expected ${this.value !== undefined ? this.value : TOKENS[this.token]}\nbut found ${token.value}`, token), idx];
		}
	}

	check() {
	}

	get_Epsilon() {
		return false;
	}

	get_First() {
		return [false, [new Token(this.token, this.value)]];
	}

	get_Follow() {

	}
}

export class MatchTerm extends Match {
	constructor(term_name, returnundefinded = false) {
		super(undefined, undefined);
		this.term_name = term_name;
		this.returnundefinded = returnundefinded;
		this.checked = false;
	}

	toString() {
		return `< ${this.term_name} >`;
	}

	match(tokens, idx = 0, language) {
		let term = language.get(this.term_name);
		let [ans, nextidx, node, error, erroridx] = term.match(tokens, idx, language);
		if (!ans) {
			if (this.returnundefinded) {
				return [true, idx, [this.term_name, null], undefined];
			}
			// console.log(error)
			// if (error.type === 'GrammerError')
			// 	return [false, idx, undefined, error, erroridx];
			return [false, idx, undefined, new SPARK_Error("GrammerError", `in grammer < ${this.term_name} > found grammer error :\n${error.message}`, tokens[idx], error.last), erroridx];
		}
		else {
			// console.log(this.term_name, error)
			return [true, nextidx, node === undefined ? [this.term_name, null] : node, error, erroridx]
		}
	}

	check(term_name, expanded, traveled = [], language) {
		if (this.term_name === term_name) {
			throw Error(`<sPARks> grammer check error: left recusion found in <${term_name}> in path\n${expanded} `)
		}
		if (traveled.includes(this.term_name)) {
			throw Error(`<sPARks> grammer check error: left recusion appeared when checking <${term_name}>`)
		}
		else {
			let term = language.get(this.term_name);
			term.check(term_name, [expanded, `<Term>\t\t\t${this.toString()} expand`].join(" \n-> "), traveled.concat(this.term_name), language);
		}
	}

	get_Epsilon(language) {
		return language.$Empty[this.term_name];
	}

	get_First(language) {
		return [language.$Empty[this.term_name], language.$First[this.term_name]]
	}

	get_Follow(term_name, language, change) {
		change(this.term_name, language.$Follow[term_name]);
	}
}

export class Skip extends Match {
	constructor() {
		super(undefined, undefined);
	}

	toString() {
		return "epsilon";
	}

	match(tokens, idx = 0, language) {
		return [true, idx, undefined, undefined, undefined]
	}

	check() {
	}

	get_Epsilon() {
		return true;
	}

	get_First() {
		return [true, []]
	}

	get_Follow() {

	}
}

Array.prototype.tab = function () {
	return this.join("\n").split('\n').map((i) => "    " + i).join('\n')
}

export const SunLang = function () {
	return new Language("sunlang", {
		'base': () => {
			return new ChooseOne([
				new MatchToken("TK_INT", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'int' }, value: token.value }] }),
				new MatchToken("TK_FLOAT", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'float' }, value: token.value }] }),
				new MatchToken("TK_STRING", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'string' }, value: token.value }] }),
				new MatchToken("TK_BOOL", undefined, (match, token) => { return ['value', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'bool' }, value: token.value }] }),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['value', { type: 'identifier', value: token.value }] }),
				new MatchTerm('tuple'),
				// new MatchTerm('funccall'),
				// new MatchTerm('dot'),
				new MatchTerm('array'),
				new Match([
					new MatchToken("TK_LCIR", undefined, (match, token) => { return undefined }),
					new MatchTerm('expression'),
					new MatchToken("TK_RCIR", undefined, (match, token) => { return undefined }),
				], (match, token) => {
					return match.nodes[0]
				})
			])
		},

		'dot': () => {
			return new Match([
				new MatchTerm('base'),
				new More_or_None([
					new ChooseOne([
						new Match([
							new MatchToken("TK_DOT", undefined, (match, token) => { return ['op', { op: "." }] }),
							new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['value', { type: 'identifier', value: token.value }] }),
						], (match, token) => { return ['binop', match.nodes] }),
						new Match([
							new MatchToken('TK_LSQR'),
							new MatchToken('TK_INT', undefined, (match, token) => { return ['length', { type: 'value', datatype: { type: 'datatype', datatype: 'base', value: 'int' }, value: token.value }] }),
							new MatchToken('TK_RSQR')
						], (match, token) => { return ['idx', [['op', { op: "[]" }], match.nodes[0]]] })
					])
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
					node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value] };
					sub = node;
				})
				return ['binop', node]
			})
		},

		'funccall': () => {
			return new Match([
				new MatchTerm('dot'),
				new Once_or_None([
					new ChooseOne([
						new Match([
							new MatchToken('TK_LCIR'),
							new Once_or_None([
								new MatchTerm('expression')
							]),
							new MatchToken('TK_RCIR')
						], (match, token) => {
							return ['tuple', { type: 'tuple', list: match.nodes[0] ? [match.nodes[0][1]] : [] }]
						}),
						new MatchTerm('tuple')

					])
				])
			], (match, token) => {
				if (match.nodes[0] && match.nodes[1]) {
					return ['funccall', { type: 'funccall', identifier: match.nodes[0][1], arguments: match.nodes[1][1].list }]
				}
				if (match.nodes[0]) {
					return match.nodes[0]
				}
				return undefined
			})
		},

		"facter": () => {
			return new Match([
				new Once_or_None([new ChooseOne([
					new MatchToken("TK_ADD", undefined, (match, token) => { return ['type', { op: "+" }] }),
					new MatchToken("TK_MINUS", undefined, (match, token) => { return ['type', { op: "-" }] }),
					new MatchToken("TK_KEYWORD", 'not', (match, token) => { return ['type', { op: "!" }] }),
				])]),
				new MatchTerm('funccall')
			], (match, token) => {
				if (match.nodes[0] && match.nodes[1])
					return ['uniop', { type: 'uniop', value: match.nodes[0][1].op, sub: [match.nodes[1][1]] }]
				else {
					return match.nodes[0]
				}
			})
		},

		"term": () => {
			return new Match([
				new MatchTerm('facter'),
				new More_or_None([
					new Match([
						new ChooseOne([
							new MatchToken("TK_MULTIPIY", undefined, (match, token) => { return ['op', { op: "*" }] }),
							new MatchToken("TK_DIVIDE", undefined, (match, token) => { return ['op', { op: "/" }] }),
							new MatchToken("TK_MOD", undefined, (match, token) => { return ['op', { op: "%" }] }),
						]),
						new MatchTerm('facter')
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
					node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value] };
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
					node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value] };
					sub = node;
				})
				return ['binop', node]
			})
		},

		"expression": () => {
			return new MatchTerm('logic')
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
					node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value] };
					sub = node;
				})
				return ['binop', node]
			})
		},

		"assign": () => {
			return new Match([
				new MatchTerm('compare'),
				new More_or_None([
					new Match([
						new MatchToken("TK_ASSIGN", undefined, (match, token) => { return ['op', { type: 'op', op: "=" }] }),
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
					node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value] };
					sub = node;
				})
				return ['binop', node]
			})
		},

		"logic": () => {
			return new Match([
				new MatchTerm('assign'),
				new More_or_None([
					new Match([
						new ChooseOne([
							new MatchToken("TK_KEYWORD", 'and', (match, token) => { return ['op', { op: "&&" }] }),
							new MatchToken("TK_KEYWORD", 'or', (match, token) => { return ['op', { op: "||" }] }),
						]),
						new MatchTerm('assign')
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
					node = { type: 'binop', value: op[1][0][1].op, sub: [sub, value] };
					sub = node;
				})
				return ['binop', node]
			})
		},

		'atomtype': () => {
			return new ChooseOne([
				new MatchTerm('tupletype'),
				new MatchTerm('arguments'),
				new MatchTerm('transtype'),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['datatype', { type: 'datatype', datatype: 'identifier', value: token.value }] }),
				new MatchToken("TK_KEYWORD", "int", (match, token) => { return ['datatype', { type: 'datatype', datatype: 'base', value: "int" }] }),
				new MatchToken("TK_KEYWORD", "float", (match, token) => { return ['datatype', { type: 'datatype', datatype: 'base', value: "float" }] }),
				new MatchToken("TK_KEYWORD", "string", (match, token) => { return ['datatype', { type: 'datatype', datatype: 'base', value: "string" }] }),
				new MatchToken("TK_KEYWORD", "bool", (match, token) => { return ['datatype', { type: 'datatype', datatype: 'base', value: "bool" }] }),
				new Match([
					new MatchToken('TK_LCIR'),
					new MatchTerm('type'),
					new MatchToken('TK_RCIR'),
				], (match, token) => {
					return match.nodes[0]
				})
			])
		},

		'type': () => {
			return new Match([
				new MatchTerm('atomtype'),
				new More_or_None([
					new Match([
						new MatchToken('TK_LSQR'),
						new Once_or_None([
							new MatchToken('TK_INT', undefined, (match, token) => { return ['length', { type: 'length', value: token.value }] })
						]),
						new MatchToken('TK_RSQR'),
					], (match, token) => {
						return ['array', match.nodes]
					})
				], (match, token) => {
					return ['arraylist', match.nodes]
				})
			], (match, token) => {
				if (match.nodes[0] && !match.nodes[1]) {
					return ['datatype', match.nodes[0][1]]
				}
				else if (match.nodes[0] && match.nodes[1]) {
					if (match.nodes[1][1].length > 0) {
						let type = match.nodes[0][1]
						match.nodes[1][1].reverse().forEach((i) => {
							type = { type: 'datatype', datatype: 'arraytype', value: type, count: i[1][0] !== undefined ? i[1][0][1].value : null }
						})
						return ['datatype', type]
					}
					return ['datatype', match.nodes[0][1]]
				}
				return undefined
			})
		},

		'arguments': () => {
			return new ChooseOne([
				new Match([
					new MatchToken('TK_LCIR'),
					new MatchToken('TK_RCIR')
				], (match, token) => {
					return ['arguments', { type: 'arguments', list: [] }]
				}),
				new Match([
					new MatchToken('TK_LCIR'),
					new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
					new Match([
						new MatchToken("TK_TYPEDEFINE"),
						new MatchTerm('type')
					], (match, token) => {

						return match.nodes[0]
					}),
					new More_or_None([
						new Match([
							new MatchToken("TK_COMMA"),
							new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),

							new Match([
								new MatchToken("TK_TYPEDEFINE"),
								new MatchTerm('type')
							], (match, token) => {
								return match.nodes[0]
							}),
						], (match, token) => {
							return [undefined, [match.nodes[0], match.nodes[1]]]
						})
					], (match, token) => {
						console.log(match.nodes)
						return ['arglist', match.nodes.map(i => i[1])]
					}),
					new MatchToken('TK_RCIR')
				], (match, token) => {
					let list = []
					if (match.nodes[0])
						list = [{ type: 'argdef', identifier: match.nodes[0][1].value, datatype: match.nodes[1] && match.nodes[1][0] !== "arglist" ? match.nodes[1][1] : null }]
					if (match.nodes[1] && match.nodes[1][0] === "arglist") {
						match.nodes[1][1].forEach((i) => {
							list.push({ type: 'argdef', identifier: i[0][1].value, datatype: i[1] ? i[1][1] : null })
						})
					}
					if (match.nodes[2]) {
						match.nodes[2][1].forEach((i) => {
							list.push({ type: 'argdef', identifier: i[0][1].value, datatype: i[1] ? i[1][1] : null })
						})
					}
					console.log(">>>>>>>")
					return ['arguments', { type: 'arguments', list: list }]
				})
			])
		},

		'tupletype': () => {
			return new Match([
				new MatchToken('TK_LCIR'),
				new MatchTerm('type'),
				new MatchToken("TK_COMMA"),
				new MatchTerm('type'),
				new More_or_None([
					new Match([
						new MatchToken("TK_COMMA"),
						new MatchTerm('type')
					], (match, token) => {
						return match.nodes[0]
					})
				], (match, token) => {
					return ['typelist', match.nodes]
				}),
				new MatchToken('TK_RCIR')
			], (match, token) => {
				let list = []
				// console.log(">>> tupletype", match.nodes)
				if (match.nodes[0] && match.nodes[1])
					list = [match.nodes[0][1], match.nodes[1][1]]
				if (match.nodes[2] && match.nodes[2][0] === "typelist") {
					match.nodes[2][1].forEach((i) => {
						list.push(i[1])
					})
				}
				return ['tupledef', { type: 'datatype', datatype: 'tupletype', list: list }]
			})
		},

		'tuple': () => {
			return new Match([
				new MatchToken('TK_LCIR'),
				new MatchTerm('expression'),
				new MatchToken("TK_COMMA"),
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
				// console.log(">>> tuple", match.nodes)
				if (match.nodes[0] && match.nodes[1])
					list = [match.nodes[0][1], match.nodes[1][1]]
				if (match.nodes[2] && match.nodes[2][0] === "explist") {
					match.nodes[2][1].forEach((i) => {
						list.push(i[1])
					})
				}
				return ['tuple', { type: 'tuple', list: list }]
			})
		},

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

		"transtype": () => {
			return new Match([
				new MatchTerm('arguments'),
				new MatchToken('TK_TO'),
				new ChooseOne([
					new MatchTerm('tupletype'),
					new Match([
						new MatchToken('TK_LCIR'),
						new Once_or_None([
							new MatchTerm('type')
						]),
						new MatchToken('TK_RCIR')
					], (match, token) => {
						return ['tupledef', { type: 'tupledef', list: match.nodes[0] ? [match.nodes[0][1]] : [] }]
					})
				])
			], (match, token) => {
				// console.log(match.nodes)
				return ['transtype', { type: 'transtype', from: match.nodes[0][1].list, to: match.nodes[1][1].list }]
			})
		},

		'vardef': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "var", (match, token) => { return undefined }),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				new Once_or_None([
					new Match([
						new MatchToken("TK_TYPEDEFINE", undefined, (match, token) => { return undefined }),
						new MatchTerm('type')
					], (match, token) => {
						return ['datatype', match.nodes[0][1]];
					})
				]),
				new Once_or_None([
					new Match([
						new MatchToken("TK_ASSIGN", undefined, (match, token) => { return undefined }),
						new MatchTerm("expression")
					], (match, token) => {
						return ['default', match.nodes[0][1]];
					})
				])
			], (match, token) => {
				if (match.nodes.length === 1) {
					return ['vardef', { type: 'vardef', identifier: match.nodes[0][1], datatype: null, default: null }];
				}
				if (match.nodes.length === 2) {
					if (match.nodes[1][0] === 'datatype') {
						return ['vardef', { type: 'vardef', identifier: match.nodes[0][1], datatype: match.nodes[1][1], default: null }];
					}
					else {
						return ['vardef', { type: 'vardef', identifier: match.nodes[0][1], datatype: null, default: match.nodes[1][1] }];
					}
				}
				if (match.nodes.length === 3) {
					return ['vardef', { type: 'vardef', identifier: match.nodes[0][1], datatype: match.nodes[1][1], default: match.nodes[2][1] }];
				}
				return undefined;
			})
		},

		'constdef': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "const", (match, token) => { return undefined }),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				new Once_or_None([
					new Match([
						new MatchToken("TK_TYPEDEFINE", undefined, (match, token) => { return undefined }),
						new MatchTerm('type')
					], (match, token) => {
						return ['datatype', match.nodes[0][1]];
					})
				]),
				new Match([
					new MatchToken("TK_ASSIGN", undefined, (match, token) => { return undefined }),
					new MatchTerm("expression")
				], (match, token) => {
					return ['default', match.nodes[0][1]];
				})
			], (match, token) => {
				if (match.nodes.length === 1) {
					return ['constdef', { type: 'constdef', identifier: match.nodes[0][1], datatype: null, default: null }];
				}
				if (match.nodes.length === 2) {
					if (match.nodes[1][0] === 'datatype') {
						return ['constdef', { type: 'constdef', identifier: match.nodes[0][1], datatype: match.nodes[1][1], default: null }];
					}
					else {
						return ['constdef', { type: 'constdef', identifier: match.nodes[0][1], datatype: null, default: match.nodes[1][1] }];
					}
				}
				if (match.nodes.length === 3) {
					return ['constdef', { type: 'constdef', identifier: match.nodes[0][1], datatype: match.nodes[1][1], default: match.nodes[2][1] }];
				}
				return undefined;
			})
		},

		'defdef': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "def", (match, token) => { return undefined }),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				new Match([
					new MatchToken("TK_TYPEDEFINE", undefined, (match, token) => { return undefined }),
					new MatchToken("TK_KEYWORD", undefined, (match, token) => { return ['deftype', token.value] })
				], (match, token) => {

					return ['datatype', match.nodes[0][1]];
				}),
				new Match([
					new MatchToken("TK_ASSIGN", undefined, (match, token) => { return undefined }),
					new MatchTerm("block")
				], (match, token) => {
					return ['default', match.nodes[0][1]];
				})
			], (match, token) => {
				// console.log(match.nodes)
				if (match.nodes[1][1] === 'class')
					return ['classdef', { type: 'classdef', identifier: match.nodes[0][1], definition: match.nodes[2][1] }];
				return undefined
			})
		},

		'return': () => {
			return new Match([
				new MatchToken('TK_KEYWORD', 'return'),
				new Once_or_None([
					new ChooseOne([
						new MatchTerm('expression'),
						new MatchTerm('tuple'),
					])
				])
			], (match, token) => {
				return ['return', { type: 'return', list: match.nodes[0] ? match.nodes[0][1] : [] }]
			})
		},

		'funcdef': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "func", (match, token) => { return undefined }),
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				new MatchToken("TK_TYPEDEFINE"),
				new MatchTerm('transtype'),
				new MatchToken("TK_ASSIGN", undefined, (match, token) => { return undefined }),
				new More_or_None([
					new MatchToken("TK_NEWLINE", undefined),
				], (match, token) => { return undefined }),
				new MatchTerm("block")
			], (match, token) => {
				return ['funcdef', { type: 'funcdef', identifier: match.nodes[0] ? match.nodes[0][1] : null, datatype: match.nodes[1] ? match.nodes[1][1] : null, sub: match.nodes[2] && match.nodes[2][1] ? match.nodes[2][1].sub : [] }];
			})
		},

		'block': () => {
			return new Match([
				new MatchToken("TK_LBRACE"),
				new More_or_None([
					new MatchToken("TK_NEWLINE", undefined),
				], (match, token) => { return undefined }),
				new More_or_None([
					new MatchTerm('program')
				], (match, token) => {
					return match.nodes[0]
				}),
				new More_or_None([
					new MatchToken("TK_NEWLINE", undefined),
				], (match, token) => { return undefined }),
				new MatchToken("TK_RBRACE")
			], (match, token) => {
				if (match.nodes[0])
					return ['block', match.nodes[0][1]];
				return undefined;
			})
		},

		'if': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "if"),
				new MatchToken("TK_TYPEDEFINE"),
				new MatchTerm('expression'),
				new MatchTerm('block'),
				new More_or_None([
					new Match([
						new MatchToken("TK_KEYWORD", "elseif"),
						new MatchToken("TK_TYPEDEFINE"),
						new MatchTerm('expression'),
						new MatchTerm('block'),
					], (match, token) => {
						return ['else if', match.nodes]
					})
				], (match, token) => {
					return ['else ifs', match.nodes]
				}),
				new Once_or_None([
					new Match([
						new MatchToken("TK_KEYWORD", "else"),
						new MatchToken("TK_TYPEDEFINE"),
						new MatchTerm('block'),
					], (match, token) => {
						return ['else', match.nodes[0]]
					})
				]),
			], (match, token) => {
				let main = undefined;
				let mainif = undefined;
				if (match.nodes[0] !== undefined)
					main = mainif = { type: 'if', expression: match.nodes[0][1], sub: match.nodes[1][1] === null ? [] : match.nodes[1][1].sub, else: [] };
				if (match.nodes[2]) {
					match.nodes[2][1].forEach((i) => {
						let elseif = { type: 'if', expression: i[1][0][1], sub: i[1][1][1] === null ? [] : [i[1][1][1]], else: [] };
						mainif.else.push(elseif);
						mainif = elseif;
					})
				}
				if (match.nodes[3] && match.nodes[3][1][1]) {
					mainif.else = match.nodes[3][1][1].sub;
				}
				// if ()
				return ["if", main]
			})
		},

		'while': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "while"),
				new Once_or_None([
					new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				]),
				// new MatchToken("TK_TYPEDEFINE"),
				new MatchToken("TK_TYPEDEFINE"),
				// new MatchToken("TK_LCIR"),
				new MatchTerm('expression', undefined, true),
				// new MatchToken("TK_RCIR"),
				new More_or_None([
					new MatchToken("TK_NEWLINE"),
				], (match, token) => { return undefined }),
				new MatchTerm('block', undefined, true)
			], (match, token) => {
				// console.log(match.nodes)
				let main = undefined;
				// let mainwhile = undefined;
				if (match.nodes.length === 2 && match.nodes[0] !== undefined)
					main = { type: 'while', expression: match.nodes[0][1], sub: match.nodes[1][1] === null ? [] : match.nodes[1][1].sub, tag: null };
				if (match.nodes.length === 3 && match.nodes[0] !== undefined)
					main = { type: 'while', expression: match.nodes[1][1], sub: match.nodes[2][1] === null ? [] : match.nodes[2][1].sub, tag: match.nodes[0][1].value };
				return ["while", main]
			})
		},

		'for': () => {
			return new Match([
				new MatchToken("TK_KEYWORD", "for"),
				// new Once_or_None([
				new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				// ]),
				new Once_or_None([
					new Match([
						new MatchToken("TK_COMMA"),
						new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
					], (match, tokens) => {
						return match.nodes[0]
					})
				]),
				// new MatchToken("TK_TYPEDEFINE"),
				new MatchToken("TK_TYPEDEFINE"),
				// new MatchToken("TK_LCIR"),
				new MatchTerm('expression', undefined, true),
				// new MatchToken("TK_IDENTIFIER", undefined, (match, token) => { return ['identifier', { type: 'identifier', value: token.value }] }),
				// new MatchToken("TK_RCIR"),
				new More_or_None([
					new MatchToken("TK_NEWLINE"),
				], (match, token) => { return undefined }),
				new MatchTerm('block', undefined, true)
			], (match, token) => {
				// console.log(match.nodes)
				let main = undefined;
				// let mainwhile = undefined;
				if (match.nodes.length === 3 && match.nodes[0] !== undefined)
					main = { type: 'for', expression: match.nodes[1][1], sub: match.nodes[2][1] === null ? [] : match.nodes[2][1].sub, tag: match.nodes[0][1].value, index: null };
				if (match.nodes.length === 4 && match.nodes[0] !== undefined)
					main = { type: 'for', expression: match.nodes[2][1], sub: match.nodes[3][1] === null ? [] : match.nodes[3][1].sub, tag: match.nodes[0][1].value, index: match.nodes[1][1].value };
				return ["for", main]
			})
		},

		'program': () => {
			return new Match([
				new More_or_None([
					new MatchToken("TK_NEWLINE", undefined),
				], (match, token) => { return undefined }),
				new MatchTerm('statement'),
				new More_or_None([
					new Match([
						new More_or_None([
							new MatchToken("TK_NEWLINE", undefined),
						], (match, token) => { return undefined }),
						new MatchTerm('statement')
					], (match, token) => {
						return match.nodes[0]
					})
				], (match, token) => { return match.nodes.length === 0 ? undefined : ['statements', match.nodes] }),
				new More_or_None([
					new MatchToken("TK_NEWLINE", undefined),
				], (match, token) => { return undefined })
			], (match, token) => {
				let nodes = [];
				if (match.nodes[0])
					nodes = [match.nodes[0][1]];
				if (match.nodes[1]) {
					nodes = nodes.concat(match.nodes[1][1].map((n) => {
						return n[1]
					}));
				}
				return ['program', { type: 'program', sub: nodes }];
			})
		},

		'statement': () => {
			return new ChooseOne([
				new MatchTerm('vardef'),
				new MatchTerm('constdef'),
				new MatchTerm('defdef'),
				new MatchTerm('funcdef'),
				new MatchTerm('expression'),
				new MatchTerm('block'),
				new MatchTerm('if'),
				new MatchTerm('while'),
				new MatchTerm('for'),
				new MatchTerm('return'),
			])
		}
	}, 'program')
}

export function typeCheck(a, b, opt = {}) {
	const { array_ignore_length = false } = opt;
	if (a.value === "$any" || b.value === "$any") {
		return true
	}
	if (a.datatype === b.datatype) {
		if (a.datatype === 'base') {
			if (a.value === '$number') {
				return 'int' === b.value || 'float' === b.value || '$number' === b.value
			}
			if (b.value === '$number') {
				return 'int' === a.value || 'float' === a.value || '$number' === a.value
			}
			else
				return a.value === b.value
		}
		else if (a.datatype === 'arraytype') {
			return typeCheck(a.value, b.value) && (array_ignore_length || (a.count === null || a.count === b.count));
		}
		else if (a.datatype === 'tupletype') {
			if (a.list.length !== b.list.length) return false;
			for (let i = 0; i < a.list.length; i++) {
				if (!typeCheck(a.list[i], b.list[i])) return false;
			}
			return true;
		}
	}
	else {
		return false;
	}
}

export function cloneType(a) {
	const type = {
		type: "datatype",
		datatype: a.datatype
	}
	if (a.datatype === 'base') {
		type.value = a.value
	}
	else if (a.datatype === 'arraytype') {
		type.count = a.count
		type.value = a.value
	}
	else if (a.datatype === 'base') {
		type.list = a.list.map(t => cloneType(t))
	}
	return type
}

export function typeToString(a) {
	if (a.datatype === "base") return a.value;
	else if (a.datatype === "arraytype") return `(${typeToString(a.value)})[${a.count === null ? '' : a.count}]`;
	else if (a.datatype === "tupletype") {
		let arr = a.list.map(i => typeToString(i))
		return `(${arr.join(', ')})`
	}
	return "$unknown";
}


export const SunLangVisitor = {
	program: {
		walk(node, path) {
			path.$scope.new_Scope()
			return ["sub"]
		},
		transform(path) {
			path.$scope.exit_Scope()
			return path.node
		}
	},
	vardef: {
		walk(node) {
			return ["default", "datatype"]
		},
		transform(path) {
			console.info(path)
			let iden = new Identifier(path.node.identifier.value, "var", path.node, path.node.datatype)
			let [ans, old] = path.$scope.registe(iden)
			if (!ans) {
				let [str, starter, end] = path.$sourcescript.get_ScriptPortion(old.def.$start, old.def.$end, "~", "yellow")
				let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>last definition here`
				return [path.node, new BaseError("VariableRedefinitionError", `\n${reason}\n\nwhen defining var <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a>\nwhich has been already defined before`, path.$start, path.$end)]
			}
			if (path.node.default !== null) {
				if (path.node.datatype === null) {
					iden.typedef = path.node.default.datatype
					path.node.datatype = path.node.default.datatype
					// if (path.node.default.datatype.value === '$unknown') {
					// 	let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.default.$start, path.node.default.$end, "~", "yellow")
					// 	let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>type is unknown`
					// 	return [path.node, new BaseError("VariableTypeIndistinctError", `\n${reason}\n\ntype of variable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> cannot be resolved`, path.$start, path.$end)]
					// }
					// else {
					return path.node
					// }
				}
				else if (!typeCheck(path.node.datatype, path.node.default.datatype)) {
					let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.datatype.$start, path.node.datatype.$end, "~", "yellow")
					let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.default.$start, path.node.default.$end, "~", "yellow")
					let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>defined as <a style="color: yellow">${typeToString(path.node.datatype)}</a>` + '\n\n' + str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>assigned with <a style="color: yellow">${typeToString(path.node.default.datatype)}</a>`
					return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> is type of ${typeToString(path.node.datatype)}\nbut its default value is type of ${typeToString(path.node.default.datatype)} which is not compatible`, path.$start, path.$end)]
				}
				return path.node
			}
			else if (path.node.datatype === null) {
				console.log(path.node)
				iden.typedef = { type: 'datatype', datatype: 'base', value: '$unknown' }
				path.node.datatype = { type: 'datatype', datatype: 'base', value: '$unknown' }
				return [path.node, new BaseError("VariableDefError", `\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a>'s type is not indicated or can be resolved`, path.$start, path.$end, { type: 'warning', color: 'orange' })]
			}
			return path.node
		}
	},
	constdef: {
		walk(node) {
			return ["default"]
		},
		transform(path) {
			console.info(path)
			let iden = new Identifier(path.node.identifier.value, "const", path.node, path.node.datatype)
			let [ans, old] = path.$scope.registe(iden)
			if (!ans) {
				let [str, starter, end] = path.$sourcescript.get_ScriptPortion(old.def.$start, old.def.$end, "~", "yellow")
				let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>last definition here`
				return [path.node, new BaseError("ConstantRedefinitionError", `\n${reason}\n\nwhen defining const <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a>\nwhich has been already defined before`, path.$start, path.$end)]
			}
			if (path.node.default.datatype.value === '$unknown') {
				let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.default.$start, path.node.default.$end, "~", "yellow")
				let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>type is unknown`
				return [path.node, new BaseError("ConstantTypeIndistinctError", `\n${reason}\n\nwhen defining const <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a>\na type should be indicated`, path.$start, path.$end)]
			}
			iden.typedef = path.node.default.datatype
			path.node.datatype = path.node.default.datatype
			// 	if (!typeCheck(path.node.datatype, path.node.default.datatype)) {
			// 		let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.datatype.$start, path.node.datatype.$end, "~", "yellow")
			// 		let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.default.$start, path.node.default.$end, "~", "yellow")
			// 		let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>defined as <a style="color: yellow">${typeToString(path.node.datatype)}</a>` + '\n\n' + str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>assigned with <a style="color: yellow">${typeToString(path.node.default.datatype)}</a>`
			// 		return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> is type of ${typeToString(path.node.datatype)}\nbut its default value is type of ${typeToString(path.node.default.datatype)} which is not compatible`, path.$start, path.$end)]
			// 	}
			return path.node
		}
	},
	// arraytype: {
	// 	walk(node) { },
	// 	transform(path) {
	// 		if (path.node.count <= 1) {
	// 			// let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.$start, path.$end, "~", "yellow")
	// 			// let reason = str1
	// 			return [{ type: "type", value: path.node.value, $start: path.$start, $end: path.$end, $startidx: path.$startidx, $endidx: path.$endidx }, new BaseError("TypeCheckWarning", `size of an array should be bigger than 1\nthis will be assumed as <a style="color: rgb(0, 255,0);">${path.node.value}</a> type`, path.$start, path.$end, { color: 'orange' })]
	// 		}
	// 		return path.node
	// 	}
	// },
	// constdef: {
	// 	walk(node) {
	// 		// console.log(">>> vardef visitor walk func", node)
	// 		return ["value"]
	// 	},
	// 	transform(path) {
	// 		// console.log(path.node)
	// 		let iden = new Identifier(path.node.identifier, "const", path.node, path.node.value.typedef)
	// 		let [ans, old] = path.$scope.registe(iden)
	// 		if (!ans) {
	// 			let [str, starter, end] = path.$sourcescript.get_ScriptPortion(old.def.$start, old.def.$end, "~", "yellow")
	// 			let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a><a style="color: yellow">last definition of ${old.def.identifier}</a>`
	// 			return [path.node, new BaseError("VariableRedefinitionError", `\n${reason}\n\nwhen defining var <a style="color: rgb(0,255,0);">${path.node.identifier}</a>\nwhich has been already defined before`, path.$start, path.$end)]
	// 		}
	// 		return path.node
	// 	}
	// },
	// assign: {
	// 	walk(node) {
	// 		// console.log(">>> vardef visitor walk func", node)
	// 		return ["identifier", "expression"]
	// 	},
	// 	transform(path) {
	// 		console.log(path.node)
	// 		if (path.node.identifier.typedef.value === '$unknown') return path.node
	// 		if (path.node.identifier.$const) {
	// 			let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.identifier.$start, path.node.identifier.$end, "~", "yellow")
	// 			// console.log(str)
	// 			let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a><a style="color: yellow">const</a>`
	// 			return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nconst <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> can not be assigned`, path.$start, path.$end)]
	// 		}
	// 		if (path.node.identifier.typedef !== null && !typeCheck(path.node.expression.typedef, path.node.identifier.typedef)) {
	// 			if (path.node.identifier.type === 'identifier') {
	// 				let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.identifier.typedef.$start, path.node.identifier.typedef.$end, "~", "yellow")
	// 				// console.log(str)
	// 				let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.expression.$start, path.node.expression.$end, "~", "yellow")
	// 				// console.log(str)
	// 				let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>defined as <a style="color: yellow">${typeToString(path.node.identifier.typedef)}</a>` + '\n\n' + str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>assigned with <a style="color: yellow">${typeToString(path.node.expression.typedef)}</a>`
	// 				return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> is type of ${typeToString(path.node.identifier.typedef)} \ntype of ${typeToString(path.node.expression.typedef)} is not compatible`, path.$start, path.$end)]
	// 			}
	// 			else {
	// 				let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.identifier.$start, path.node.identifier.$end, "~", "yellow")
	// 				// console.log(str)
	// 				let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.expression.$start, path.node.expression.$end, "~", "yellow")
	// 				// console.log(str)
	// 				let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>type of <a style="color: yellow">${typeToString(path.node.identifier.typedef)}</a>` + '\n\n' + str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>assigned with <a style="color: yellow">${typeToString(path.node.expression.typedef)}</a>`
	// 				return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.identifier.value}[int]</a> is type of ${typeToString(path.node.identifier.typedef)} \ntype of ${typeToString(path.node.expression.typedef)} is not compatible`, path.$start, path.$end)]
	// 			}
	// 		}
	// 		return path.node
	// 	}
	// },
	array: {
		walk: (node) => {
			console.log("---------------", node)
			return ["list"];
		},
		transform: (path) => {
			path.node.datatype = { type: 'datatype', datatype: 'arraytype', value: '$unknown', count: path.node.list.length };
			if (path.node.list.length === 0) {
				return path.node;
			}
			let firsttype = path.node.list[0].datatype;
			let remain = path.node.list.slice(1);
			let pass = true;
			for (let i = 0; i < remain.length; i++) {
				console.info(firsttype, remain[i].datatype)
				if (!typeCheck(firsttype, remain[i].datatype)) {
					pass = false;
					break;
				}
			}
			console.log(firsttype)
			if (!pass) {
				let reasons = path.node.list.map((s, i) => {
					let [str, starter, end] = path.$sourcescript.get_ScriptPortion(s.$start, s.$end, "~", "yellow")
					return str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">${typeToString(s.datatype)}</a>`
				})
				return [path.node, new BaseError("ArrayDefinitionError", `\n${reasons.join("\n")}\n\nan array can only contain value with the same type`, path.$start, path.$end)]
			}
			// console.log(pass, remain, path.node.expressions.length)
			path.node.datatype.value = firsttype;
			return path.node;
		}
	},
	tuple: {
		walk: (node) => {
			console.log("---------------", node)
			return ["list"];
		},
		transform: (path) => {
			let typelist = path.node.list.map(i => i.datatype)
			path.node.datatype = { type: 'datatype', datatype: 'tupletype', list: typelist };
			return path.node;
		}
	},
	// proc: {
	// 	walk(node) {

	// 		return []
	// 	},
	// 	transform(path) {
	// 		return path.node
	// 	}
	// },
	// value: {
	// 	walk() { },
	// 	transform(path) {
	// 		return {
	// 			type: 'value',
	// 			$immediate: true,
	// 			typedef: { type: "type", value: path.node.datatype },
	// 			value: path.node.value
	// 		}
	// 	}
	// },
	identifier: {
		walk(node) {
		},
		transform(path) {
			console.log("identifier", path)
			let iden = path.$scope.get(path.node.value);
			if (iden === undefined) {
				path.node.identype = "$unknown";
				path.node.$const = false;
				path.node.datatype = { type: 'datatype', datatype: 'base', value: '$unknown' };
				path.node.def = undefined;
				return [path.node, new BaseError("IdentifierUndefinedError", `variable <a style="color: rgb(0,255,0);">${path.node.value}</a> is not defined in this scope`, path.$start, path.$end)]
			}
			else {
				path.node.identype = iden.type;
				path.node.$const = iden.type === 'const';
				path.node.datatype = iden.typedef;
				path.node.def = iden.def;
			}
			path.node.$immediate = false;
			return path.node;
		}
	},
	// binop: {
	// 	walk(node) {
	// 		// console.log(">>> binop visitor walk func", node)
	// 		return ["sub"]
	// 	},
	// 	transform(path) {
	// 		// console.log(path.node)
	// 		const BINOP = {
	// 			'+': (a, b) => { return a + b },
	// 			'-': (a, b) => { return a - b },
	// 			'*': (a, b) => { return a * b },
	// 			'/': (a, b) => { return a / b },
	// 		}
	// 		const TYPEMAP = {
	// 			"int": (right) => {
	// 				switch (right) {
	// 					case "int": return "int";
	// 					case "real": return "real";
	// 					case "string": return "string";
	// 					default: return "$unknown";
	// 				}
	// 			},
	// 			"real": (right) => {
	// 				switch (right) {
	// 					case "int": return "real";
	// 					case "real": return "real";
	// 					case "string": return "string";
	// 					default: return "$unknown";
	// 				}
	// 			},
	// 			"string": (right) => {
	// 				switch (right) {
	// 					case "int": return "string";
	// 					case "real": return "string";
	// 					case "string": return "string";
	// 					default: return "$unknown";
	// 				}
	// 			},
	// 			"$unknown": (right) => {
	// 				return "$unknown";
	// 			}
	// 		}
	// 		let type = { type: 'type', value: '$unknown' };
	// 		if (path.node.sub[0].typedef !== null && path.node.sub[1].typedef !== null) {
	// 			if (path.node.sub[0].typedef.type !== 'type' || path.node.sub[1].typedef.type !== 'type') {
	// 				let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.sub[0].$start, path.node.sub[0].$end, "~", "yellow")
	// 				let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.sub[1].$start, path.node.sub[1].$end, "~", "yellow")
	// 				let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>type of <a style="color: yellow">${typeToString(path.node.sub[0].typedef)}</a>` + '\n\n' + str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>type of <a style="color: yellow">${typeToString(path.node.sub[1].typedef)}</a>`
	// 				return [{
	// 					type: 'binop',
	// 					value: path.node.value,
	// 					$immediate: false,
	// 					typedef: type,
	// 					sub: path.node.sub
	// 				}, new BaseError("OperationError", `\n${reason}\n\narray type is not allowed in bin operation`, path.$start, path.$end)]
	// 			}
	// 			else
	// 				type = { type: "type", value: TYPEMAP[path.node.sub[0].typedef.value](path.node.sub[1].typedef.value) };
	// 		}
	// 		if (path.node.sub[0].$immediate && path.node.sub[1].$immediate) {
	// 			return {
	// 				type: 'value',
	// 				$immediate: true,
	// 				typedef: type,
	// 				value: BINOP[path.node.value](path.node.sub[0].value, path.node.sub[1].value)
	// 			}
	// 		}
	// 		return {
	// 			type: 'binop',
	// 			value: path.node.value,
	// 			$immediate: false,
	// 			typedef: type,
	// 			sub: path.node.sub
	// 		}
	// 	}
	// },
	// uniop: {
	// 	walk(node) {
	// 		console.log(">>> uni visitor walk func", node)
	// 		return ["sub"]
	// 	},
	// 	transform(path) {
	// 		// console.log(path.node)
	// 		let type = { type: 'type', value: '$unknown' };
	// 		if (path.node.sub[0].typedef !== null) {
	// 			type = { type: "type", value: (path.node.sub[0].typedef.value) };
	// 		}
	// 		if (path.node.sub[0].$immediate) {
	// 			return {
	// 				type: 'value',
	// 				$immediate: true,
	// 				typedef: type,
	// 				value: -(path.node.sub[0].value)
	// 			}
	// 		}
	// 		return {
	// 			type: 'uniop',
	// 			value: path.node.value,
	// 			$immediate: false,
	// 			typedef: type,
	// 			sub: path.node.sub
	// 		}
	// 	}
	// },
	// indexof: {
	// 	walk: (node) => {
	// 		console.log(node);
	// 		return ["identifier", "index"];
	// 	},
	// 	transform: (path) => {
	// 		path.node.typedef = { type: 'type', value: path.node.identifier.typedef.value, $start: path.node.identifier.typedef.$start, $end: path.node.identifier.typedef.$end };
	// 		if (path.node.identifier.typedef.value === '$unknown') return path.node;
	// 		if (path.node.identifier.typedef.type !== 'arraytype') {
	// 			let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.identifier.typedef.$start, path.node.identifier.typedef.$end, "~", "yellow")
	// 			let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>defined as <a style="color: yellow">${typeToString(path.node.identifier.typedef)}</a>`
	// 			return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> is type of ${typeToString(path.node.identifier.typedef)}, not array`, path.$start, path.$end)]
	// 		}
	// 		else if (path.node.index.typedef.type !== "type" || path.node.index.typedef.value !== 'int') {
	// 			let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.index.$start, path.node.index.$end, "~", "yellow")
	// 			let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>type of <a style="color: yellow">${typeToString(path.node.index.typedef)}</a>`
	// 			return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nindex of an array should be <a style="color: rgb(0,255,0);">int</a>`, path.$start, path.$end)]
	// 		}
	// 		else if (path.node.index.$immediate && (path.node.index.value < 0 || path.node.index.value >= path.node.identifier.typedef.count)) {
	// 			let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.index.$start, path.node.index.$end, "~", "yellow")
	// 			let reason = str1
	// 			return [path.node, new BaseError("ArrayAccessOutOfBoundError", `\n${reason}\nindex of an array should meet <a style="color: rgb(0,255,0);">0 <= </a>index <a style="color: rgb(0,255,0);"><= ${path.node.identifier.typedef.count - 1}</a>`, path.$start, path.$end)]
	// 		}
	// 		return path.node;
	// 	}
	// },
	// convert: {
	// 	walk(node) {
	// 		return ['value']
	// 	},
	// 	transform(path) {
	// 		path.node.typedef = { type: 'type', value: '$unknown' };
	// 		if (path.node.value.typedef.type !== 'type') {
	// 			let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.value.$start, path.node.value.$end, "~", "yellow")
	// 			let reason = str1 + `<a style="color: white">${starter1}${end1}<a style="color: yellow">${typeToString(path.node.value.typedef)}</a>`
	// 			return [path.node, new BaseError("CanNotCastError", `\n${reason}\n\nexpression is type of ${typeToString(path.node.value.typedef)}\nonly atom type <a style="color: rgb(0,255,0)">int</a>/<a style="color: rgb(0,255,0)">real</a>/<a style="color: rgb(0,255,0)">string</a> can be casted`, path.$start, path.$end)]
	// 		}
	// 		// if (path.node.value.typedef.value === '$unknown' ){
	// 		// 	let [str1, starter1, end1] = path.$sourcescript.get_ScriptPortion(path.node.identifier.typedef.$start, path.node.identifier.typedef.$end, "~", "yellow")
	// 		// 	let reason = str1 + `<a style="color: white">${starter1}${end1}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter1}${end1}</a>defined as <a style="color: yellow">${typeToString(path.node.identifier.typedef)}</a>`
	// 		// 	return [path.node, new BaseError("TypeCheckError", `\n${reason}\n\nvariable <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a> is type of ${typeToString(path.node.identifier.typedef)}, not array`, path.$start, path.$end)]
	// 		// }
	// 		// if (path.node.value.$immediate === true) {

	// 		// }
	// 		path.node.$immediate = false;
	// 		path.node.typedef = path.node.to;
	// 		return path.node
	// 	}
	// },
	// proc: {
	// 	walk(node) {
	// 		return ["block"]
	// 	},
	// 	transform(path) {
	// 		let iden = new Identifier(path.node.identifier.identifier, "procedure", path.node, path.node.typedef)
	// 		let [ans, old] = path.$scope.registe(iden)
	// 		if (!ans) {
	// 			let [str, starter, end] = path.$sourcescript.get_ScriptPortion(old.def.$start, old.def.$end, "~", "yellow")
	// 			let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a><a style="color: yellow">last definition of ${old.def.identifier}</a>`
	// 			return [path.node, new BaseError("IdentifierRedefinitionError", `\n${reason}\n\nwhen defining procedure <a style="color: rgb(0,255,0);">${path.node.identifier.identifier}</a>\nwhich has been already used before`, path.node.identifier.$start, path.node.identifier.$end)]
	// 		}
	// 		return path.node
	// 	}
	// },
	// block: {
	// 	walk(node) {
	// 		return ["statments"]
	// 	},
	// 	transform(path) {
	// 		return path.node
	// 	}
	// },
	// if: {
	// 	walk(node) {
	// 		// console.log(node)
	// 		return ["sub", "else"]
	// 	},
	// 	transform(path) {
	// 		return path.node
	// 	}
	// },
	// while: {
	// 	walk(node) {
	// 		// console.log(node)
	// 		return ["sub"]
	// 	},
	// 	transform(path) {
	// 		return path.node
	// 	}
	// },
	// call: {
	// 	walk(node) {
	// 		return ["identifier"]
	// 	},
	// 	transform(path) {
	// 		if (path.node.identifier.identype === '$unknown') return path.node;
	// 		if (path.node.identifier.identype !== 'procedure') {
	// 			let [str, starter, end] = path.$sourcescript.get_ScriptPortion(path.node.identifier.def.$start, path.node.identifier.def.$end, "~", "yellow")
	// 			let reason = str + `<a style="color: white">${starter}${end}</a><a style="color: yellow">|</a>\n<a style="color: white">${starter}${end}</a>definition of <a style="color: yellow">${path.node.identifier.value}</a>`
	// 			return [path.node, new BaseError("UnmatchedProcedureError", `\n${reason}\n\nwhen calling procedure <a style="color: rgb(0,255,0);">${path.node.identifier.value}</a>\nwhich is not a callable procedure`, path.node.identifier.$start, path.node.identifier.$end)]
	// 		}
	// 		return path.node
	// 	}
	// },
	// write: {
	// 	walk(node) {
	// 		return ["expressions"]
	// 	},
	// 	transform(path) {
	// 		return path.node
	// 	}
	// },
	// read: {
	// 	walk(node) {
	// 		return ["identifiers"]
	// 	},
	// 	transform(path) {
	// 		return path.node
	// 	}
	// }
}

class Identifier {
	constructor(name, type, def, typedef) {
		this.name = name
		this.type = type
		this.def = def
		this.typedef = typedef
	}
}

class Scope {
	constructor() {
		this.stack = [];
		this.current = {};
	}

	get(name) {
		if (this.current[name] !== undefined) return this.current[name];
		let len = this.stack.length - 1;
		while (len >= 0) {
			if (this.stack[len][name] !== undefined) return this.stack[len][name];
			len--;
		}
		return undefined;
	}

	registe(identifier) {
		if (this.current[identifier.name] !== undefined) {
			return [false, this.current[identifier.name]];
		}
		else {
			this.current[identifier.name] = identifier;
			console.log(this)
			return [true, undefined];
		}
	}

	new_Scope() {
		this.stack.push(this.current);
		this.current = {};
	}

	exit_Scope() {
		this.current = this.stack.pop();
	}
}

export class Walker {
	constructor(ast, visitors, tokens, sourcescript, immediate_throw = false) {
		this.ast = ast;
		this.tokens = tokens;
		this.sourcescript = sourcescript;
		this.visitors = visitors;
		this.scope = new Scope();
		this.error = [];
		this.immediate_throw = immediate_throw
	}

	create_Node(ast, parent = null) {
		// console.log(ast)
		return {
			parent: parent,
			node: ast,
			$scope: this.scope,
			$sourcescript: this.sourcescript,
			$tokens: this.tokens,
			$start: ast.$start,
			$end: ast.$end,
			$startidx: ast.$startidx,
			$endidx: ast.$endidx
		}
	}

	walk(ast = this.ast, parent = null) {
		// console.log(">>>>>", ast.type, this.visitors[ast.type])
		if (this.visitors[ast.type] === undefined) {
			return [ast, this.error]
		}
		let subs = this.visitors[ast.type].walk(ast, this.create_Node(ast, parent)) ?? [];
		if (subs !== undefined) {
			for (let key of subs) {
				let target = ast[key];
				if (target === undefined || target === null) continue;
				if (target instanceof Array) {
					let ans = [];
					for (let t of target) {
						if (t === null || t === undefined) continue;
						let [newast, _] = this.walk(t, ast);
						if (newast === null && this.immediate_throw) {
							return [null, this.error]
						}
						ans.push(newast);
					}
					ast[key] = ans;
				}
				else {
					let [newast, _] = this.walk(target, ast, this.error);
					if (newast === null && this.immediate_throw) {
						return [null, this.error]
					}
					ast[key] = newast;
				}
			}
		}

		let ans = this.visitors[ast.type].transform(this.create_Node(ast, parent)) ?? ast;
		let newast;
		if (ans instanceof Array) {
			newast = ans[0];
			this.error.push(ans[1])
			if (this.immediate_throw) return [null, this.error]
		}
		else {
			newast = ans;
		}
		return [newast, this.error];
	}
}

// translater
export class Formatter {
	constructor(ast) {
		this.ast = ast;
		this.target = '';
		this.uid = BigInt(0);
		this.colors = {
			string: '#8bc34a',
			number: 'orange',
			keyword: '#e91e63',
			type: 'tomato',
			identifier: '#ffd54f',
			operator: '#03a9f4',
		}
	}

	tint(str, type) {
		return `<span style="color: ${this.colors[type]};">${str}</span>`
	}

	get_Value(ast) {
		if (ast.datatype.datatype === 'base') {
			switch (ast.datatype.value) {
				case 'string': return this.tint(`"${ast.value}"`, 'string');
				default: return this.tint(ast.value, 'number');
			}
		}
	}

	typeToString(a) {
		if (a.datatype === "base") return this.tint(a.value, 'type');
		else if (a.datatype === "arraytype") return `(${this.typeToString(a.value)})[${a.count === null ? '' : this.tint(a.count, 'number')}]`;
		else if (a.datatype === "tupletype") {
			let arr = a.list.map(i => this.typeToString(i))
			return `${this.tint('(', 'operator')}${arr.join(', ')}${this.tint(')', 'operator')}`
		}
		return "$unknown";
	}

	exp(ast, last = null) {
		console.log(ast)
		if (ast.type === 'value') {
			return this.get_Value(ast)
		}
		else if (ast.type === 'funccall') {
			const MAP = {
				print: (args, raw) => { `console.log(${args})` },
				range: (args, raw) => {
					let uid = this.get_uid()
					return `(()=>{let arr${uid} = [];for (let i = 1; i <= ${args}; i++) {arr${uid}.push(i)};return arr${uid}})()`
				}
			}
			let args = ast.arguments.map(i => this.exp(i)).join(", ")
			let func = this.exp(ast.identifier)
			return MAP[func] !== undefined ? MAP[func](args, ast.arguments) : `${func}(${args})`
		}
		else if (ast.type === 'identifier') {
			return this.tint(ast.value, 'identifier')
		}
		else if (ast.type === 'binop') {
			if (ast.value === '[]') {
				return `(${this.exp(ast.sub[0], ast.value)}[${this.exp(ast.sub[1], ast.value)}])`
			}
			return `(${this.exp(ast.sub[0], ast.value)}${ast.value}${this.exp(ast.sub[1], ast.value)})`
			// return `${ast.value !== last && last !== null ? '(' : ''}${this.exp(ast.sub[0], ast.value)}${ast.value}${this.exp(ast.sub[1], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
		}
		else if (ast.type === 'uniop') {
			return `${ast.value !== last && last !== null ? '(' : ''}${ast.value}${this.exp(ast.sub[0], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
		}
		else if (ast.type === 'array') {
			let items = ast.list.map(i => this.exp(i)).join(', ')
			return `[${items}]`
		}
		else if (ast.type === 'tuple') {
			let items = ast.list.map(i => this.exp(i)).join(', ')
			return `[${items}]`
		}
	}

	vardef(ast) {
		return `${this.tint('var', 'keyword')} ${this.tint(ast.identifier.value, 'identifier')} : ${this.typeToString(ast.datatype)} ${ast.default !== null ? `${this.tint('=', 'operator')} ${this.exp(ast.default)}` : ''}`
	}

	constdef(ast) {
		return `const ${ast.identifier.value}${ast.default !== null ? ` = ${this.exp(ast.default)}` : ''}`
	}

	funcdef(ast, func = true) {
		let args = ast.datatype.from.map(i => i.identifier).join(", ")
		let body = ast.sub.map(s => this.get(s)).tab()
		return `${func ? 'function ' : ''}${ast.identifier.value}(${args}) {\n${body}\n}`
	}

	funccall(ast) {
		const MAP = {
			print: 'console.log'
		}
		let args = ast.arguments.map(i => this.exp(i)).join(", ")
		let func = this.exp(ast.identifier)
		return `${MAP[func] !== undefined ? MAP[func] : func}(${args})`
	}

	binop(ast, last = null) {
		return `${ast.value !== last && last !== null ? '(' : ''}${this.exp(ast.sub[0], ast.value)}${ast.value}${this.exp(ast.sub[1], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
	}

	uniop(ast, last = null) {
		return `${ast.value !== last && last !== null ? '(' : ''}${ast.value}${this.exp(ast.sub[0], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
	}

	if(ast) {
		let ifbody = ast.sub.map(s => this.get(s)).tab()
		let elsebody = ast.else.map(s => this.get(s)).tab()
		return `if (${this.exp(ast.expression)}) {\n${ifbody}\n}${ast.else.length === 0 ? '' : `\nelse {\n${elsebody}\n}`}`
	}

	while(ast) {
		let whilebody = ast.sub.map(s => this.get(s)).tab()
		return `${ast.tag !== null ? ast.tag + ':\n' : ''}while (${this.exp(ast.expression)}) {\n${whilebody}\n}`
	}

	classdef(ast) {
		let uid = this.get_uid()
		let vardefs = ast.definition ? ast.definition.sub.filter(i => i.type === 'vardef') : []
		let init = vardefs.map(i => `this.${i.identifier}${i.default !== null ? ` = ${this.exp(i.default)}` : ''}`).tab()
		let initstr = ['constructor() {', init, '}'].tab()
		let funcdefs = ast.definition ? ast.definition.sub.filter(i => i.type === 'funcdef').map(i => this.funcdef(i, false)).tab() : ''
		return `class class${uid} {\n${initstr}\n${funcdefs}\n}\nfunction ${ast.identifier}() {\n    return new class${uid}\n}`
	}

	for(ast) {
		let whilebody = ast.sub.map(s => this.get(s)).tab()
		let index = ast.index === null ? 'i' + this.get_uid() : ast.index
		let exptag = 'forexp' + this.get_uid()
		let exp = this.exp(ast.expression)
		return `let ${exptag} = ${exp}\nfor (let ${index} = 0; ${index} < ${exptag}.length; ${index}++) {\n    let ${ast.tag} = ${exptag}[${index}]\n${whilebody}\n}`
	}

	return(ast) {
		return `return ${this.exp(ast.list)}`
	}

	program(ast) {
		let sub = ast.sub;
		sub = sub.map((s) => {
			return this.get(s);
		})
		return `${sub.join('\n')}`;
	}

	get(s) {
		return this[s.type] ? this[s.type](s) : 'unknown node'
	}

	convert() {
		this.target = this[this.ast.type](this.ast);
		return this.target;
	}
}

export class JSConverter {
	constructor(ast) {
		this.ast = ast;
		this.target = '';
		this.uid = BigInt(0);
		this.currentscope = {};
		this.scope = [this.currentscope];
	}

	registe_var(name) {
		if (this.currentscope[name]) { return null }
		else {
			let newname = `var_${this.get_uid()}`
			this.currentscope[name] = newname
			return name
		}
	}

	get_var(name) {
		return name//this.currentscope[name]
	}

	get_uid() {
		return this.uid++;
	}

	get_Value(ast) {
		if (ast.datatype.datatype === 'base') {
			switch (ast.datatype.value) {
				case 'string': return `"${ast.value}"`;
				default: return ast.value;
			}
		}
	}

	exp(ast, last = null) {
		console.log(ast)
		if (ast.type === 'value') {
			return this.get_Value(ast)
		}
		else if (ast.type === 'funccall') {
			const MAP = {
				print: (args, raw) => { `console.log(${args})` },
				range: (args, raw) => {
					let uid = this.get_uid()
					return `(()=>{let arr${uid} = [];for (let i = 1; i <= ${args}; i++) {arr${uid}.push(i)};return arr${uid}})()`
				}
			}
			let args = ast.arguments.map(i => this.exp(i)).join(", ")
			let func = this.exp(ast.identifier)
			return MAP[func] !== undefined ? MAP[func](args, ast.arguments) : `${func}(${args})`
		}
		else if (ast.type === 'identifier') {
			const GL = ['print', 'range']
			if (GL.includes(ast.value)) return ast.value
			return this.get_var(ast.value)
		}
		else if (ast.type === 'binop') {
			if (ast.value === '[]') {
				return `(${this.exp(ast.sub[0], ast.value)}[${this.exp(ast.sub[1], ast.value)}])`
			}
			return `(${this.exp(ast.sub[0], ast.value)}${ast.value}${this.exp(ast.sub[1], ast.value)})`
			// return `${ast.value !== last && last !== null ? '(' : ''}${this.exp(ast.sub[0], ast.value)}${ast.value}${this.exp(ast.sub[1], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
		}
		else if (ast.type === 'uniop') {
			return `${ast.value !== last && last !== null ? '(' : ''}${ast.value}${this.exp(ast.sub[0], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
		}
		else if (ast.type === 'array') {
			let items = ast.list.map(i => this.exp(i)).join(', ')
			return `[${items}]`
		}
		else if (ast.type === 'tuple') {
			let items = ast.list.map(i => this.exp(i)).join(', ')
			return `[${items}]`
		}
	}

	vardef(ast) {
		return `let ${ast.identifier.value}${ast.default !== null ? ` = ${this.exp(ast.default)}` : ''}`
	}

	constdef(ast) {
		return `const ${ast.identifier.value}${ast.default !== null ? ` = ${this.exp(ast.default)}` : ''}`
	}

	funcdef(ast, func = true) {
		let args = ast.datatype.from.map(i => i.identifier).join(", ")
		let body = ast.sub.map(s => this.get(s)).tab()
		return `${func ? 'function ' : ''}${ast.identifier.value}(${args}) {\n${body}\n}`
	}

	funccall(ast) {
		const MAP = {
			print: 'console.log'
		}
		let args = ast.arguments.map(i => this.exp(i)).join(", ")
		let func = this.exp(ast.identifier)
		return `${MAP[func] !== undefined ? MAP[func] : func}(${args})`
	}

	binop(ast, last = null) {
		return `${ast.value !== last && last !== null ? '(' : ''}${this.exp(ast.sub[0], ast.value)}${ast.value}${this.exp(ast.sub[1], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
	}

	uniop(ast, last = null) {
		return `${ast.value !== last && last !== null ? '(' : ''}${ast.value}${this.exp(ast.sub[0], ast.value)}${ast.value !== last && last !== null ? ')' : ''}`
	}

	if(ast) {
		let ifbody = ast.sub.map(s => this.get(s)).tab()
		let elsebody = ast.else.map(s => this.get(s)).tab()
		return `if (${this.exp(ast.expression)}) {\n${ifbody}\n}${ast.else.length === 0 ? '' : `\nelse {\n${elsebody}\n}`}`
	}

	while(ast) {
		let whilebody = ast.sub.map(s => this.get(s)).tab()
		return `${ast.tag !== null ? ast.tag + ':\n' : ''}while (${this.exp(ast.expression)}) {\n${whilebody}\n}`
	}

	classdef(ast) {
		let uid = this.get_uid()
		let vardefs = ast.definition ? ast.definition.sub.filter(i => i.type === 'vardef') : []
		let init = vardefs.map(i => `this.${i.identifier}${i.default !== null ? ` = ${this.exp(i.default)}` : ''}`).tab()
		let initstr = ['constructor() {', init, '}'].tab()
		let funcdefs = ast.definition ? ast.definition.sub.filter(i => i.type === 'funcdef').map(i => this.funcdef(i, false)).tab() : ''
		return `class class${uid} {\n${initstr}\n${funcdefs}\n}\nfunction ${ast.identifier}() {\n    return new class${uid}\n}`
	}

	for(ast) {
		let whilebody = ast.sub.map(s => this.get(s)).tab()
		let index = ast.index === null ? 'i' + this.get_uid() : ast.index
		let exptag = 'forexp' + this.get_uid()
		let exp = this.exp(ast.expression)
		return `let ${exptag} = ${exp}\nfor (let ${index} = 0; ${index} < ${exptag}.length; ${index}++) {\n    let ${ast.tag} = ${exptag}[${index}]\n${whilebody}\n}`
	}

	return(ast) {
		return `return ${this.exp(ast.list)}`
	}

	program(ast) {
		let sub = ast.sub;
		sub = sub.map((s) => {
			return this.get(s);
		})
		return `${sub.join('\n')}`;
	}

	get(s) {
		return this[s.type] ? this[s.type](s) : 'unknown node'
	}

	convert() {
		this.target = this[this.ast.type](this.ast);
		return this.target;
	}
}