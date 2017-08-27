/**
 * Created by sam on 13.02.2017.
 */

import {IColumnDesc, createSelectionDesc} from 'lineupjs/src/model';
import {ICategory} from 'lineupjs/src/model/CategoricalColumn';
import LineUp from 'lineupjs/src/lineup';
import {extent} from 'd3';
import {IAnyVector} from 'phovea_core/src/vector';
import {VALUE_TYPE_STRING, VALUE_TYPE_CATEGORICAL, VALUE_TYPE_REAL, VALUE_TYPE_INT} from 'phovea_core/src/datatype';

export interface IAdditionalColumnDesc extends IColumnDesc {
  selectedId: number;
  selectedSubtype?: string;
}

export interface IColumnOptions {
  /**
   * visible by default
   * @default true
   */
  visible: boolean;
  /**
   * custom label instead of the column name
   * @default column
   */
  label: string;
  /**
   * specify an initial width
   * @default -1 = none
   */
  width: number;
  /**
   * used internally to match selections to column
   * @default -1
   */
  selectedId: number;
  /**
   * used internally to match selections to multiple columns
   * @default: undefined
   */
  selectedSubtype: string;
}

function baseColumn(column: string, options: Partial<IColumnOptions> = {}): IAdditionalColumnDesc {
  return Object.assign({
    type: 'string',
    column,
    label: column,
    color: '',
    visible: true,
    width: -1,
    selectedId: -1,
    selectedSubtype: undefined
  }, options);
}

export function numberColFromArray(column: string, rows: any[], options: Partial<IColumnOptions> = {}): IAdditionalColumnDesc {
  return Object.assign(baseColumn(column, options), {
    type: 'number',
    domain: extent(rows, (d) => d[column])
  });
}

/**
 * creates a new LineUp description for a numerical column
 * @param {string} column the column name to use
 * @param {number} min the input minimal value
 * @param {number} max the input maximal value
 * @param {Partial<IColumnOptions>} options
 * @returns {IAdditionalColumnDesc}
 */
export function numberCol(column: string, min: number, max: number, options: Partial<IColumnOptions> = {}): IAdditionalColumnDesc {
  return Object.assign(baseColumn(column, options), {
    type: 'number',
    domain: [min, max],
  });
}

/**
 * creates a new LineUp description for a categorical column
 * @param {string} column the column name to use
 * @param {(string | ICategory)[]} categories description of the categories
 * @param {Partial<IColumnOptions>} options
 * @returns {IAdditionalColumnDesc}
 */
export function categoricalCol(column: string, categories: (string|ICategory)[], options: Partial<IColumnOptions> = {}): IAdditionalColumnDesc {
  return Object.assign(baseColumn(column, options), {
    type: 'categorical',
    categories
  });
}
/**
 * creates a new LineUp description for a string column
 * @param {string} column the column name to use
 * @param {Partial<IColumnOptions>} options
 * @returns {IAdditionalColumnDesc}
 */
export function stringCol(column: string, options: Partial<IColumnOptions> = {}): IAdditionalColumnDesc {
  return Object.assign(baseColumn(column, options), {});
}

/**
 * creates a new LineUp description for a boolean column
 * @param {string} column the column name to use
 * @param {Partial<IColumnOptions>} options
 * @returns {IAdditionalColumnDesc}
 */
export function booleanCol(column: string, options: Partial<IColumnOptions> = {}): IAdditionalColumnDesc {
  return Object.assign(baseColumn(column, options), {
    type: 'boolean'
  });
}

export function deriveCol(col: IAnyVector): IColumnDesc {
  const r: any = {
    column: col.desc.name
  };
  const desc = <any>col.desc;
  if (desc.color) {
    r.color = desc.color;
  } else if (desc.cssClass) {
    r.cssClass = desc.cssClass;
  }
  const val = desc.value;
  switch (val.type) {
    case VALUE_TYPE_STRING:
      r.type = 'string';
      break;
    case VALUE_TYPE_CATEGORICAL:
      r.type = 'categorical';
      r.categories = desc.categories;
      break;
    case VALUE_TYPE_REAL:
    case VALUE_TYPE_INT:
      r.type = 'number';
      r.domain = val.range;
      break;
    default:
      r.type = 'string';
      break;
  }
  return r;
}

export function createInitialRanking(lineup: LineUp) {
  const provider = lineup.data;
  const ranking = provider.pushRanking();
  ranking.push(provider.create(createSelectionDesc()));

  lineup.data.getColumns().filter((d) => (<any>d).visible !== false).forEach((d) => {
    const col = this.provider.create(d);
    // set initial column width
    if (typeof (<any>d).width === 'number' && (<any>d).width > -1) {
      col.setWidth((<any>d).width);
    }
    ranking.push(col);
  });
}
