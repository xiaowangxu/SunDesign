import { TypesManagerSingleton, ExpTypes } from "../../SunDesign/Core.js";

TypesManagerSingleton.extends(null, 'number', {
    n: {
        datatype: ExpTypes.base(ExpTypes.number),
        default: '0'
    }
});
TypesManagerSingleton.extends('number', 'int', {
    n: {
        datatype: ExpTypes.base(ExpTypes.int),
        default: '0'
    }
});
TypesManagerSingleton.extends('number', 'float', {
    n: {
        datatype: ExpTypes.base(ExpTypes.float),
        default: '0.0'
    }
});