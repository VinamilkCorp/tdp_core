import {IFormElementDesc, IForm} from '../interfaces';
import * as d3 from 'd3';
import {AFormElement} from './AFormElement';

export interface ICheckBoxElementDesc extends IFormElementDesc {
  options: {
    /**
     * checked value
     */
    checked?: any;
    /**
     * unchecked value
     */
    unchecked?: any;
    /**
     * default value
     */
    isChecked?: any;
  };
}

export default class FormCheckBox extends AFormElement<ICheckBoxElementDesc> {

  private $input: d3.Selection<any>;

  /**
   * Constructor
   * @param form
   * @param $parent
   * @param desc
   */
  constructor(form: IForm, $parent: d3.Selection<any>, desc: ICheckBoxElementDesc) {
    super(form, Object.assign({options: { checked: true, unchecked: false}}, desc));

    this.$node = $parent.append('div').classed('checkbox', true);

    this.build();
  }

  /**
   * Build the label and input element
   */
  protected build() {
    super.build();
    const $label = this.$node.select('label');
    if ($label.empty()) {
      this.$input = this.$node.append('input').attr('type', 'checkbox');
    } else {
      this.$input = $label.html(`<input type="checkbox">${$label.text()}`).select('input');
    }
    this.setAttributes(this.$input, this.desc.attributes);
    this.$input.classed('form-control', false); //remove falsy class again
  }

  /**
   * Bind the change listener and propagate the selection by firing a change event
   */
  initialize() {
    super.initialize();

    const options = this.desc.options;
    const isChecked: boolean = options.isChecked != null? options.isChecked : this.getStoredValue(options.unchecked) === options.checked;
    this.previousValue = isChecked;
    this.$input.property('checked', isChecked);
    if (this.hasStoredValue()) { // trigger if we have a stored value
      // TODO: using the new value `isChecked` may be wrong, because it's of type boolean and options.checked and options.unchecked could be anything --> this.getStoredValue(...) should probably be used instead
      this.fire(FormCheckBox.EVENT_INITIAL_VALUE, isChecked, options.unchecked); // store initial values as actions with results in the provenance graph
    }

    this.handleDependent();

    // propagate change action with the data of the selected option
    this.$input.on('change.propagate', () => {
      this.fire(FormCheckBox.EVENT_CHANGE, this.value, this.$input);
    });
  }

  /**
   * Returns the value
   * @returns {string}
   */
  get value() {
    const options = this.desc.options;
    return this.$input.property('checked') ? options.checked : options.unchecked;
  }

  /**
   * Sets the value
   * @param v
   */
  set value(v: any) {
    const options = this.desc.options;
    this.$input.property('value', v === options.checked);
    this.previousValue = v === options.checked; // force old value change
    this.updateStoredValue();
  }

  focus() {
    (<HTMLInputElement>this.$input.node()).focus();
  }
}
