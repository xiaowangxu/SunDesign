import { ALL_INPUTS_TYPES, DepGraph, Types, Collection, ExpTypes, TypesManagerSingleton, BitMask } from './Core.js';
import { parse_Constant, parse_Expression, test_IdentifierName, test_Number } from './Core.js';
import { typeCheck, typeToString } from './sPARks.js';
import { SDML_Compile_CodeGen, create_Component, SDML_Compile_Error } from './Compiler.js';
import { registe_Tag } from './TagCollection.js';

export class SDML_Compiler_Visitor {
    constructor(scope, name, id, parent, ast, params, param_inputs_for_bitmasks = [], auto_bitmasks = true) {
        this.scope = scope;
        this.name = name;
        this.id = id;
        this.uid = this.scope.env.uid;
        this.parent = parent;
        this.deps = new Set();
        this.noderefs = new Set();
        this.params = {};
        this.types_maps = {};
        if (params !== undefined) {
            this.parse(params, ast);
        }
        this.auto_bitmasks = auto_bitmasks;
        this.bitmasks = new BitMask([...param_inputs_for_bitmasks, '$children']);
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
        }, [], false);
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
        }, [], false);
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
        super(scope, name, id, parent, ast, {}, [], false);
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
        return [`if (s.${this.slotname} !== null) {`,
        `   this.b[${layer}] |= ${mask};`,
        `   this.${nodename} = s.${this.slotname};`,
            `}`,];
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

export class SDML_ComponentNode extends SDML_Compiler_Visitor {
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
        super(scope, name, id, parent, ast, params, [], false);
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

registe_Tag('if', SDML_If);
registe_Tag('for', SDML_For);
registe_Tag('slot', SDML_Slot);