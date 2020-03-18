/**
 * Created by Samuel Gratzl on 08.03.2017.
 */

import AFormElement from './AFormElement';
import {IForm, IFormElementDesc} from '../interfaces';
import {IFormSelectDesc} from './FormSelect';
import Select3, {IdTextPair, ISelect3Item, ISelect3Options} from './Select3';
import {ISelect2Option} from './FormSelect2';
import {IPluginDesc} from 'phovea_core/src/plugin';

declare type IFormSelect3Options = Partial<ISelect3Options<ISelect2Option>> & {
  return?: 'text' | 'id';
  data?: ISelect2Option[] | ((dependents: any) => ISelect2Option[]);
};

/**
 * Add specific options for select form elements
 */
export interface IFormSelect3 extends IFormElementDesc {
  /**
   * Additional options
   */
  options?: IFormSelect3Options;
}

/**
 * Select2 drop down field with integrated search field and communication to external data provider
 * Propagates the changes from the DOM select element using the internal `change` event
 */
export default class FormSelect3 extends AFormElement<IFormSelect3> {

  private readonly isMultiple: boolean;

  private select3: Select3<IdTextPair>;

  /**
   * Constructor
   * @param form The form this element is a part of
   * @param elementDesc The form element description
   * @param pluginDesc The phovea extension point description
   */
  constructor(form: IForm, elementDesc: IFormSelect3, readonly pluginDesc: IPluginDesc) {
    super(form, elementDesc, pluginDesc);

    this.isMultiple = (pluginDesc.selection === 'multiple');
  }

  /**
   * Build the label and select element
   * @param $formNode The parent node this element will be attached to
   */
  build($formNode: d3.Selection<any>) {
    this.addChangeListener();

    this.$node = $formNode.append('div').classed('form-group', true);
    this.setVisible(this.elementDesc.visible);
    this.appendLabel();

    const options = Object.assign(this.elementDesc.options, {multiple: this.isMultiple});
    this.select3 = new Select3(options);
    this.$node.node().appendChild(this.select3.node);

    this.elementDesc.attributes.clazz = this.elementDesc.attributes.clazz.replace('form-control', ''); // filter out the form-control class, because the border it creates doesn't contain the whole element due to absolute positioning and it isn't necessary
    this.setAttributes(this.$node.select('.select3'), this.elementDesc.attributes);
  }

  /**
   * Bind the change listener and propagate the selection by firing a change event
   */
  init() {
    super.init();

    this.select3.on(Select3.EVENT_SELECT, (evt, prev: IdTextPair[], next: IdTextPair[]) => {
      this.fire(FormSelect3.EVENT_CHANGE, next);
    });
  }

  /**
   * Returns the selected value or if nothing found `null`
   * @returns {ISelect3Item<IdTextPair> | string | (ISelect3Item<IdTextPair> | string)[]}
   */
  get value(): (ISelect3Item<IdTextPair> | string) | (ISelect3Item<IdTextPair> | string)[] {
    const returnValue = this.elementDesc.options.return;
    const returnFn = returnValue === 'id' ? (d) => d.id : (returnValue === 'text' ? (d) => d.text : (d) => d);
    const value = <IdTextPair[]>this.select3.value;

    if (!value || value.length === 0) {
      return this.isMultiple ? [] : returnFn({id: '', text: ''});
    }
    const data = value.map((d) => ({id: d.id, text: d.text})).map(returnFn);
    return this.isMultiple ? data : data[0];
  }

  hasValue() {
    return this.select3.value.length > 0;
  }

  /**
   * Select the option by value. If no value found, then the first option is selected.
   * @param v If string then compares to the option value property. Otherwise compares the object reference.
   */
  set value(v: (ISelect3Item<IdTextPair> | string) | (ISelect3Item<IdTextPair> | string)[]) {
    const toIdTextPair = (d) => {
      if (typeof d === 'string') {
        return {id: d, text: d};
      } else {
        return {
          id: d.id ? d.id : d.text,
          text: d.text ? d.text : d.id
        };
      }
    };

    if (!v) {
      this.select3.value = this.previousValue = [];
      this.updateStoredValue();
      return;
    }

    this.previousValue = this.select3.value;
    if (Array.isArray(v) && v.length > 0 && !this.isMultiple) { // an array of items or string (id or text)
      this.select3.value = v.slice(0, 1).map(toIdTextPair);
    } else if (Array.isArray(v) && v.length > 0 && this.isMultiple) {
      this.select3.value = v.map(toIdTextPair);
    } else if (!Array.isArray(v)) { // an item or string (id or text)
      this.select3.value = [toIdTextPair(v)];
    }
    this.updateStoredValue();
  }

  focus() {
    this.select3.focus();
  }
}
