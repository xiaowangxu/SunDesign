export const ALL_NODE_TYPES = {}

export function registe_Tag(name, constructor) {
    ALL_NODE_TYPES[name] = constructor;
}