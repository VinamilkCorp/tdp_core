import {IFormElementDesc, IForm} from '../interfaces';
import * as d3 from 'd3';
import {AFormElement} from './AFormElement';
import {IFormSelectOption} from './FormSelect';
import {IPluginDesc} from 'phovea_core';

export interface IRadioElementDesc extends IFormElementDesc {
  options: {
    buttons: IFormSelectOption[];
  };
}

export class FormRadio extends AFormElement<IRadioElementDesc> {

  /**
   * Constructor
   * @param form The form this element is a part of
   * @param elementDesc The form element description
   * @param pluginDesc The phovea extension point description
   */
  constructor(form: IForm, elementDesc: IRadioElementDesc, readonly pluginDesc: IPluginDesc) {
    super(form, Object.assign({options: {buttons: []}}, elementDesc), pluginDesc);
  }

  /**
   * Build the label and input element
   * @param $formNode The parent node this element will be attached to
   */
  build($formNode: d3.Selection<any>) {
    this.addChangeListener();

    this.$node = $formNode.append('div').classed('mb-3', true);
    this.setVisible(this.elementDesc.visible);
    this.appendLabel();

    const $label = this.$node.select('label');

    const options = this.elementDesc.options;

    const $buttons = this.$node.selectAll('div.radio-inline').data(options.buttons);
    $buttons.enter().append('div').classed('radio-inline form-check form-check-inline', true).html((d, i) => `<input class="form-check-input" type="radio"
        name="${this.id}" id="${this.id}${i === 0 ? '' : i}" value="${d.value}">
      <label class="form-label form-check-label" for="${this.id}${i === 0 ? '' : i}"> ${d.name}</label>`);
    const $buttonElements = $buttons.select('input');

    $buttonElements.on('change', (d) => {
      this.fire(FormRadio.EVENT_CHANGE, d, $buttons);
    });

    // TODO: fix that the form-control class is only appended for textual form elements, not for all
    this.elementDesc.attributes.clazz = this.elementDesc.attributes.clazz.replace('form-control', ''); // filter out the form-control class, because it is mainly used for text inputs and destroys the styling of the radio
    this.setAttributes($buttonElements, this.elementDesc.attributes);
  }

  /**
   * Bind the change listener and propagate the selection by firing a change event
   */
  init() {
    super.init();

    const options = this.elementDesc.options;
    const defaultOption = options.buttons[0].data;
    const defaultValue = this.getStoredValue(defaultOption);
    this.value = defaultValue;
    this.previousValue = defaultValue;

    if (this.hasStoredValue()) {
      this.fire(FormRadio.EVENT_INITIAL_VALUE, this.value, defaultOption);
    }

    this.handleDependent();
  }

  /**
   * Returns the value
   * @returns {string}
   */
  get value() {
    const checked = this.$node.select('input:checked');
    return checked.empty() ? null : checked.datum().data;
  }

  /**
   * Sets the value
   * @param v
   */
  set value(v: any) {
    this.$node.selectAll('input').property('checked', (d) => d === v || d.data === v);
    this.previousValue = v; // force old value change
    this.updateStoredValue();
  }

  focus() {
    (<HTMLInputElement>this.$node.select('input').node()).focus();
  }
}
