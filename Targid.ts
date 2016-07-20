/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import C = require('../caleydo_core/main');
import prov = require('../caleydo_clue/prov');
import plugins = require('../caleydo_core/plugin');
import events = require('../caleydo_core/event');
import ranges = require('../caleydo_core/range');
import idtypes = require('../caleydo_core/idtype');
import d3 = require('d3');
import {ViewWrapper, EViewMode, createWrapper, AView, ISelection, setSelection, setAndUpdateSelection} from './View';
import {ICmdResult, IAction} from "../caleydo_clue/prov";


/**
 * Creates a view instance and wraps the instance with the inverse action in a CLUE command
 * @param inputs Array with object references, where the first one is the TargId object
 * @param parameter Parameter such idtype, selection and view options
 * @param graph The Provenance graph
 * @returns {Promise<ICmdResult>}
 */
export function createViewImpl(inputs:prov.IObjectRef<any>[], parameter:any, graph:prov.ProvenanceGraph):Promise<ICmdResult> {
  const targid:Targid = inputs[0].value;
  const viewId:string = parameter.viewId;
  const idtype = parameter.idtype ? idtypes.resolve(parameter.idtype) : null;
  const selection = parameter.selection ? ranges.parse(parameter.selection) : ranges.none();
  const options = parameter.options;

  const view = plugins.get('targidView', viewId);

  var wrapper;
  return createWrapper(graph, { idtype: idtype, range: selection }, targid.node, view, options).then((instance) => {
    wrapper = instance;
    return targid.pushImpl(instance);
  }).then((oldFocus) => {
    return (<ICmdResult>{
      created: [wrapper.ref],
      inverse: (inputs, created, removed) => removeView(inputs[0], created[0], oldFocus)
    });
  });
}

/**
 * Removes a view instance and wraps the instance with the inverse action in a CLUE command
 * @param inputs Array with object references, where the first one is the TargId object
 * @param parameter Parameter such idtype, selection and view options
 * @returns {ICmdResult}
 */
export function removeViewImpl(inputs:prov.IObjectRef<any>[], parameter):ICmdResult {
  const targid:Targid = inputs[0].value;
  const view:ViewWrapper = inputs[1].value;
  const oldFocus:number = parameter.focus;

  targid.removeImpl(view, oldFocus);
  return (<ICmdResult>{
    removed: [inputs[1]],
    inverse: createView(inputs[0], view.desc.id, view.selection.idtype, view.selection.range, view.options)
  });
}

/**
 * Creates a view and adds a CLUE command view to the provenance graph
 * @param targid
 * @param viewId
 * @param idtype
 * @param selection
 * @param options
 * @returns {IAction}
 */
export function createView(targid:prov.IObjectRef<Targid>, viewId:string, idtype:idtypes.IDType, selection:ranges.Range, options?):IAction {
  const view = plugins.get('targidView', viewId);
  // assert view
  return prov.action(prov.meta('Add ' + view.name, prov.cat.visual, prov.op.create), Targid.CMD_CREATE_VIEW, createViewImpl, [targid], {
    viewId: viewId,
    idtype: idtype ? idtype.id : null,
    selection: selection ? selection.toString() : ranges.none().toString(),
    options: options
  });
}

/**
 * Removes a view and adds a CLUE command view to the provenance graph
 * @param targid
 * @param view ViewWrapper instance of the view
 * @param oldFocus
 * @returns {IAction}
 */
export function removeView(targid:prov.IObjectRef<Targid>, view:prov.IObjectRef<ViewWrapper>, oldFocus = -1):IAction {
  // assert view
  return prov.action(prov.meta('Remove View: ' + view.toString(), prov.cat.visual, prov.op.remove), Targid.CMD_REMOVE_VIEW, removeViewImpl, [targid, view], {
    viewId: view.value.desc.id,
    focus: oldFocus
  });
}

/**
 * Create a CLUE command by ID
 * @param id
 * @returns {ICmdFunction|null}
 */
export function createCmd(id):prov.ICmdFunction {
  switch (id) {
    case Targid.CMD_CREATE_VIEW:
      return createViewImpl;
    case Targid.CMD_REMOVE_VIEW:
      return removeViewImpl;
  }
  return null;
}

/**
 * Factory function that compresses a series of action to fewer one.
 * Note: This function is referenced as `actionCompressor` in the package.json
 * @type {string}
 * @param path
 * @returns {Array}
 */
export function compressCreateRemove(path:prov.ActionNode[]) {
  var r = [];
  for (let i = 0; i < path.length; ++i) {
    let p = path[i];
    if (p.f_id === Targid.CMD_REMOVE_VIEW && r.length > 0) {
      let last = r[r.length - 1];
      if (last.f_id === Targid.CMD_CREATE_VIEW && p.parameter.viewId === last.parameter.viewId) {
        r.pop();
        continue;
      }
    }
    r.push(p);
  }
  return r;
}

/**
 * The main class for the TargID app
 * This class ...
 * - handles the creation, removal, and focus of views
 * - provides a reference to open views
 * - provides a reference to the provenance graph
 */
export class Targid {

  /**
   * Static constant for creating a view command
   * Note: the string value is referenced for the `actionFactory` and `actionCompressor` in the package.json
   * @type {string}
   */
  static CMD_CREATE_VIEW = 'targidCreateView';

  /**
   * Static constant for removing a view command
   * Note: the string value is referenced for the `actionFactory` and `actionCompressor` in the package.json
   * @type {string}
   */
  static CMD_REMOVE_VIEW = 'targidRemoveView';

  /**
   * List of open views (e.g., to show in the history)
   * @type {ViewWrapper[]}
   */
  private views:ViewWrapper[] = [];

  /**
   * IObjectRef to this Targid instance
   * @type {IObjectRef<Targid>}
   */
  ref:prov.IObjectRef<Targid>;

  private $mainNavi:d3.Selection<any>;
  private $history:d3.Selection<any>;
  private $node:d3.Selection<Targid>;

  private removeWrapper = (event:any, view:ViewWrapper) => this.remove(view);
  private openWrapper = (event:events.IEvent, viewId:string, idtype:idtypes.IDType, selection:ranges.Range) => this.openRight(<ViewWrapper>event.target, viewId, idtype, selection);
  private updateSelection = (event:events.IEvent, old: ISelection, new_: ISelection) => this.updateItemSelection(<ViewWrapper>event.target, old, new_);

  constructor(public graph:prov.ProvenanceGraph, parent:Element) {

    // add TargId app as (first) object to provenance graph
    this.ref = graph.findOrAddObject(this, 'Targid', prov.cat.visual);

    this.$history = d3.select(parent).append('ul').classed('history', true);
    this.$history.append('li').classed('homeButton', true)
      .html(`<a href="#">
        <i class="fa fa-home" aria-hidden="true"></i>
        <span class="sr-only">Start</span>
      </a>`);
    this.$history.select('.homeButton > a').on('click', (d) => {
      // prevent changing the hash (href)
      (<Event>d3.event).preventDefault();
      this.focusOnStart();
    });

    const $wrapper = d3.select(parent).append('div').classed('wrapper', true);

    this.$node = $wrapper.append('div').classed('targid', true).datum(this);
    plugins.get('targidView', 'welcome').load().then((p) => {
      p.factory(this.$node.node(), {});
    });

    this.$mainNavi = $wrapper.insert('nav', ':first-child').classed('mainNavi', true);
    plugins.get('targidView', 'mainNavi').load().then((p) => {
      p.factory(this.$mainNavi.node(), { targid: this });
    });
  }

  get node() {
    return <Element>this.$node.node();
  }

  private openRight(view:ViewWrapper, viewId:string, idtype:idtypes.IDType, selection:ranges.Range, options?) {
    this.focus(view).then(() => this.pushView(viewId, idtype, selection, options));
  }

  private updateItemSelection(view:ViewWrapper, old: ISelection, new_: ISelection, options?) {
    if (this.lastView === view) {
      //just update the selection
      this.graph.pushWithResult(setSelection(view.ref,new_.idtype, new_.range), { inverse : setSelection(view.ref, old.idtype, old.range)});
    } else {
      const i = this.views.indexOf(view);
      const right = this.views[i+1];
      if (right === this.lastView && right.matchSelectionLength(new_.range.dim(0).length)) {
        //update selection and within the view
        right.setParameterSelection(new_);
        this.graph.pushWithResult(setAndUpdateSelection(view.ref,right.ref, new_.idtype, new_.range), { inverse : setAndUpdateSelection(view.ref, right.ref, old.idtype, old.range)});
      } else {
        //jump to a previous state, record the selection and then patch the rest
        this.focus(view).then(() => {
          return this.graph.pushWithResult(setSelection(view.ref, new_.idtype, new_.range), {inverse: setSelection(view.ref, old.idtype, old.range)});
        }).then(() => {
          if (right.matchSelectionLength(new_.range.dim(0).length)) {
            return this.pushView(right.desc.id, new_.idtype, new_.range, options);
          }
        });
      }
    }
  }

  get lastView() {
    return this.views[this.views.length-1];
  }

  push(viewId:string, idtype:idtypes.IDType, selection:ranges.Range, options?) {
    // create the first view without changing the focus for the (non existing) previous view
    if(this.views.length === 0) {
      return this.pushView(viewId, idtype, selection, options);

    } else {
      return this.focus(this.views[0]).then(() => this.pushView(viewId, idtype, selection, options));
    }
  }

  private pushView(viewId:string, idtype:idtypes.IDType, selection:ranges.Range, options?) {
    return this.graph.push(createView(this.ref, viewId, idtype, selection, options));
  }

  remove(index_or_view:number|ViewWrapper) {
    const view = typeof index_or_view === 'number' ? this.views[<number>index_or_view] : <ViewWrapper>index_or_view;
    const view_ref = this.graph.findObject(view);
    if(view_ref === null) {
      console.warn('remove view:', 'view not found in graph', (view ? `'${view.desc.id}'` : view));
      return;
    }
    return this.graph.push(removeView(this.ref, view_ref));
  }

  pushImpl(view:ViewWrapper) {
    view.on(ViewWrapper.EVENT_REMOVE, this.removeWrapper);
    view.on(ViewWrapper.EVENT_OPEN, this.openWrapper);
    view.on(AView.EVENT_ITEM_SELECT, this.updateSelection);
    this.views.push(view);
    this.update();
    return C.resolveIn(100).then(() => this.focusImpl(this.views.length - 1));
  }

  removeImpl(view:ViewWrapper, focus:number = -1) {
    const i = this.views.indexOf(view);
    view.off(ViewWrapper.EVENT_REMOVE, this.removeWrapper);
    view.off(ViewWrapper.EVENT_OPEN, this.openWrapper);
    view.off(AView.EVENT_ITEM_SELECT, this.updateSelection);

    this.views.splice(i, 1);
    this.update();
    view.destroy();
    //remove with focus change if not already hidden
    if (!isNaN(focus) && view.mode !== EViewMode.HIDDEN) {
      if (focus < 0) {
        focus = i - 1;
      }
      return this.focusImpl(focus);
    }
    return Promise.resolve(NaN);
  }

  /**
   * Jumps to a given viewWrapper in the provenance graph
   * @param view
   * @returns {any} Promise
   */
  focus(view: ViewWrapper) {
    const creators = this.graph.act.path.filter(isCreateView).map((d) => d.creator);
    const createdBy = this.graph.findOrAddJustObject(view.ref).createdBy;
    const i = creators.indexOf(createdBy);
    if ( i === (creators.length-1)) {
      //we are in focus - or should be
      return Promise.resolve(null);
    } else {
      //jump to the last state this view was in focus
      return this.graph.jumpTo(creators[i+1].previous);
    }
  }

  /**
   * Jumps back to the root of the provenance graph and consequentially removes all open views (undo)
   */
  focusOnStart() {
    const creators = this.graph.act.path.filter((d) => d.creator === null); // null => start StateNode
    if(creators.length > 0) {
      this.graph.jumpTo(creators[0]);
    }
  }

  removeLastImpl() {
    return this.removeImpl(this.views[this.views.length - 1]);
  }

  showInFocus(d: ViewWrapper) {
    this.focusImpl(this.views.indexOf(d));
  }

  focusImpl(index:number) {
    var old = -1;
    this.views.forEach((v, i) => {
      if (v.mode === EViewMode.FOCUS) {
        old = i;
      }
      var target = EViewMode.HIDDEN;
      if (i === index) {
        target = EViewMode.FOCUS;
      } else if (i === (index - 1)) {
        target = EViewMode.CONTEXT;
      }
      v.mode = target;
    });
    if (old === index) {
      return Promise.resolve(old);
    }
    this.update();
    return C.resolveIn(1000).then(() => old);
  }

  private update() {
    const $views = this.$history.selectAll('li.hview').data(this.views);
    $views.enter()
      .append('li').classed('hview', true)
      .append('a').attr('href', '#')
      .on('click', (d) => {
        (<Event>d3.event).preventDefault();
        this.showInFocus(d);
      });

    $views
      .classed('t-context', (d) => d.mode === EViewMode.CONTEXT)
      .classed('t-hide', (d) => d.mode === EViewMode.HIDDEN)
      .classed('t-focus', (d) => d.mode === EViewMode.FOCUS)
      .select('a').text((d) => d.desc.name);
    $views.exit().remove();
  }
}

/**
 * Helper function to filter views that were created
 * @param stateNode
 * @returns {boolean}
 */
function isCreateView(stateNode: prov.StateNode) {
  const creator = stateNode.creator;
  return creator != null && creator.meta.category === prov.cat.visual && creator.meta.operation === prov.op.create;
}

/**
 * Factory method to create a new Targid instance
 * @param graph
 * @param parent
 * @returns {Targid}
 */
export function create(graph:prov.ProvenanceGraph, parent:Element) {
  return new Targid(graph, parent);
}
