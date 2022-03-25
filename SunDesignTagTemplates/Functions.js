export function range(a, b, c) {
    const ans = [];
    for (let i = a; i < b; i += c)
        ans.push(i);
    return ans;
}