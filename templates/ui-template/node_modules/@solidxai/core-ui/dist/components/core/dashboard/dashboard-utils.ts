// export enum RuleMatchMode {
//     EQUALS = '$equals',
//     NOT_EQUALS = '$notEquals',
//     CONTAINS = '$contains',
//     NOT_CONTAINS = '$notContains',
//     STARTS_WITH = '$startsWith',
//     ENDS_WITH = '$endsWith',
//     IN = '$in',
//     NOT_IN = '$notIn',
//     BETWEEN = '$between',
//     LT = '$lt',
//     LTE = '$lte',
//     GT = '$gt',
//     GTE = '$gte'
// }

export const getNumberOfInputs = (matchMode: any): number | null => {

    switch (matchMode) {
        case '$between':
            return 2;
        case '$in':
        case '$notIn':
            return null;
        case '$startsWith':
        case '$contains':
        case '$notContains':
        case '$endsWith':
        case '$equals':
        case '$notEquals':
        case '$lt':
        case '$lte':
        case '$gt':
        case '$gte':
            return 1;
        default:
            return 1; // Default to single input if no specific match is found
    }
}
