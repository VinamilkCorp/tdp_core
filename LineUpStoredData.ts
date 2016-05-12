/**
 * Created by Samuel Gratzl on 29.01.2016.
 */
/// <reference path="./tsd.d.ts" />

import ajax = require('../caleydo_core/ajax');
import d3 = require('d3');
import idtypes = require('../caleydo_core/idtype');
import ranges = require('../caleydo_core/range');
import datas = require('../caleydo_core/data');
import lineupData = require('../lineup4bi/lineup_data');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, useDefaultLayout,} from '../targid2/LineUpView';

export class StoredLineUp extends ALineUpView {
  private dataId: string;
  private dataIDType: string;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
    this.dataId = options && options.dataId ? options.dataId : null;
    this.dataIDType = options && options.dataIDType ? options.dataId : 'custom';
    //TODO
    this.build();
  }

  private build() {
    //generate random data
    this.setBusy(true);
    datas.get(this.dataId).then((d: lineupData.LineUpDataSet) => {
      return d.data().then((data) => {
        const colId = data.columns[0].column;
        const l = this.buildLineUp(data.data, data.columns, idtypes.resolve(this.dataIDType), null);
        useDefaultLayout(l);
        this.setBusy(false);
      });
    })
  }
}

export function createLoadStartFactory(parent: HTMLElement) {
  const $parent = d3.select(parent);
  var current = null;
  datas.list().then((items: any[]) => {
    items = items.filter((d) => d.desc.type === 'lineup_data');
    const $options = $parent.selectAll('div.radio').data(items);
    $options.enter().append('div').classed('radio', true)
      .html((d,i) => `<label><input type="radio" name="loadedDataSet" value="${d.desc.name}" ${i === 0 ? 'checked' : ''}>${d.desc.name}</label>`)
      .select('input').on('change', (d) => current = d);
  });
  function buildOptions(): any {
    if (current === null) {
      return {};
    }
    return {
      dataId: current.desc.id
    }
  }
  return () => buildOptions();
}


export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new StoredLineUp(context, selection, parent, options);
}


