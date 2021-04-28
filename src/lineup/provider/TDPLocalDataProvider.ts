import {IColumnConstructor, IColumnDesc, IDataProviderOptions, ILocalDataProviderOptions, isSupportType, ITypeFactory, LocalDataProvider} from 'lineupjs';

/**
 * A data provider which changes the default column width from LineUp
 */
export default class TDPLocalDataProvider extends LocalDataProvider {
    constructor(_data: any[], columns: IColumnDesc[] = [], options: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {}) {
        super(_data, columns, options);
    }

    protected instantiateColumn(type: IColumnConstructor, id: string, desc: IColumnDesc, typeFactory: ITypeFactory) {
        // cache the column width because initializing the `type` class mutates the desc object
        const columnWidth = desc.width;

        // create a column instance needed for the `isSupportType(col)`
        const col = new type(id, desc, typeFactory);


        if (columnWidth >= 0 || isSupportType(col)) {
            return col;
        }

        if (desc.type === 'string') {
            col.setWidthImpl(140); // use `setWidthImpl` instead of `setWidth` to avoid triggering an event
        } else {
            col.setWidthImpl(110);
        }
        return col;
    }
}
