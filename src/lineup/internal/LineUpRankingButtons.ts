/**
 * Created by sam on 13.02.2017.
 */

import {createStackDesc, IColumnDesc, createScriptDesc, Ranking} from 'lineupjs/src/model';
import * as d3 from 'd3';
import {IDType, resolve} from 'phovea_core/src/idtype';
import {IPlugin, IPluginDesc, list as listPlugins} from 'phovea_core/src/plugin';
import {editDialog} from '../../storage';
import {EventHandler} from 'phovea_core/src/event';
import {FormElementType, IFormElementDesc, FormBuilder} from '../../form';
import {
  IScoreLoader, EXTENSION_POINT_TDP_SCORE_LOADER, EXTENSION_POINT_TDP_SCORE, EXTENSION_POINT_TDP_RANKING_BUTTON,
  IScoreLoaderExtensionDesc, IRankingButtonExtension, IRankingButtonExtensionDesc
} from '../../extensions';
import ADataProvider from 'lineupjs/src/provider/ADataProvider';
import * as $ from 'jquery';

interface IColumnWrapper<T> {
  text: string;
  action: (param: T) => void;
  plugins?: T[];
}

interface IWrappedColumnDesc {
  text: string;
  id: string;
  column: IColumnDesc;
}

const FORM_ID_ADDITIONAL_COLUMN = 'tdp.lineup.column.add';

/**
 * Wraps the score such that the plugin is loaded and the score modal opened, when the factory function is called
 * @param score
 * @returns {IScoreLoader}
 */
export function wrap(score: IPluginDesc): IScoreLoader {
  return {
    text: score.name,
    id: score.id,
    scoreId: score.id,
    factory(extraArgs: object, count: number) {
      return score.load().then((p) => Promise.resolve(p.factory(score, extraArgs, count)));
    }
  };
}

export default class LineUpRankingButtons extends EventHandler {
  static readonly EVENT_SAVE_NAMED_SET = 'saveNamedSet';
  static readonly EVENT_ADD_SCORE_COLUMN = 'addScoreColumn';
  static readonly EVENT_ADD_TRACKED_SCORE_COLUMN = 'addTrackedScoreColumn';

  private readonly $ul: d3.Selection<HTMLUListElement>;

  constructor(private readonly provider: ADataProvider, private readonly $node: d3.Selection<any>, private readonly idType: IDType, private readonly extraArgs: object|(() => object)) {
    super();

    this.$ul = this.$node.append('ul').classed('tdp-button-group', true);

    this.appendDownload();
    this.appendSaveRanking();
    this.appendMoreColumns();
    this.appendExtraButtons();
  }

  private createMarkup(title: string, linkClass: string = '', linkListener: (param: any) => void | null, liClass: string = '') {
    const $li = this.$ul.append('li')
      .classed(liClass, liClass.length > 0);

    $li.append('a')
      .attr('title', title)
      .attr('href', '#')
      .classed(linkClass, linkClass .length > 0)
      .on('click', linkListener);

    return $li;
  }

  private appendDownload() {
    const listener = (ranking: Ranking) => {
      this.provider.exportTable(ranking, {separator: ';', quote: true}).then((content) => {
        const downloadLink = document.createElement('a');
        const blob = new Blob([content], {type: 'text/csv;charset=utf-8'});
        downloadLink.href = URL.createObjectURL(blob);
        (<any>downloadLink).download = 'export.csv';

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      });
    };

    this.createMarkup('Export Data', 'fa fa-download', listener);
  }

  private appendSaveRanking() {
    const listener = (ranking: Ranking) => {
      (<Event>d3.event).preventDefault();
      (<Event>d3.event).stopPropagation();

      this.saveRankingDialog(ranking.getOrder());
    };

    this.createMarkup('Save Named Set', 'fa fa-save', listener);
  }

  private saveRankingDialog(order: number[]) {
    editDialog(null, (name, description, isPublic) => {
      this.fire(LineUpRankingButtons.EVENT_SAVE_NAMED_SET, order, name, description, isPublic);
    });
  }

  static findMappablePlugins(target: IDType, all: IPluginDesc[]) {
    const idTypes = Array.from(new Set<string>(all.map((d) => d.idtype)));

    function canBeMappedTo(idtype: string) {
      if (idtype === target.id) {
        return true;
      }
      //lookup the targets and check if our target is part of it
      return resolve(idtype).getCanBeMappedTo().then((mappables: IDType[]) => mappables.some((d) => d.id === target.id));
    }
    //check which idTypes can be mapped to the target one
    return Promise.all(idTypes.map(canBeMappedTo)).then((mappable: boolean[]) => {
      const valid = idTypes.filter((d, i) => mappable[i]);
      return all.filter((d) => valid.indexOf(d.idtype) >= 0);
    });
  }

  private resolveArgs() {
    return typeof this.extraArgs === 'function' ? this.extraArgs() : this.extraArgs;
  }

  private async appendMoreColumns() {
    const $dropdownLi = this.createMarkup('Add Column', 'fa fa-plus dropdown-toggle', null, 'dropdown');

    $dropdownLi.select('a')
      .attr('data-toggle', 'dropdown');

    const $selectWrapper = $dropdownLi.append('div').attr('class', 'dropdown-menu');

    const builder = new FormBuilder($selectWrapper);

    // load plugins, which need to be checked if the IDTypes are mappable
    const ordinoScores: IPluginDesc[] = await LineUpRankingButtons.findMappablePlugins(this.idType, listPlugins(EXTENSION_POINT_TDP_SCORE));
    const metaDataPluginDescs = <IScoreLoaderExtensionDesc[]>await LineUpRankingButtons.findMappablePlugins(this.idType, listPlugins(EXTENSION_POINT_TDP_SCORE_LOADER));

    const metaDataPluginPromises: Promise<IColumnWrapper<IScoreLoader>>[] = metaDataPluginDescs
      .map((plugin: IScoreLoaderExtensionDesc) => plugin.load()
        .then((loadedPlugin: IPlugin) => loadedPlugin.factory(plugin))
        .then((scores: IScoreLoader[]) => {
          return this.buildMetaDataDescriptions(plugin, scores.sort((a, b) => a.text.localeCompare(b.text)));
        })
      );

    // Load meta data plugins
    const metaDataOptions = await Promise.all(metaDataPluginPromises);
    const loadedScorePlugins = ordinoScores.map((desc) => wrap(desc));


    const columns: IWrappedColumnDesc[] = this.provider.getColumns()
      .filter((d) => !(<any>d)._score)
      .map((d) => ({ text: d.label, id: (<any>d).column, column: d }))
      .sort((a, b) => a.text.localeCompare(b.text));

    const dynamicCombinations: IWrappedColumnDesc[] = [
      { text: 'Weighted Sum', id: 'weightedSum', column: createStackDesc('Weighted Sum') },
      { text: 'Scripted Combination', id: 'scriptedCombination', column: createScriptDesc('Scripted Combination') }
    ];

    const lineUpAction: (wrappedColumn: IWrappedColumnDesc) => void = (wrappedColumn: IWrappedColumnDesc) => {
      const ranking = this.provider.getLastRanking();
      this.provider.push(ranking, wrappedColumn.column);
    };

    const columnsWrapper: IColumnWrapper<IScoreLoader|IWrappedColumnDesc>[] = [
      {
        text: 'Database Columns',
        plugins: columns,
        action: lineUpAction
      },
      {
        text: 'Parameterized Scores',
        plugins: loadedScorePlugins,
        action: (scorePlugin: IScoreLoader) => {
          // number of rows of the last ranking
          const amountOfRows: number = this.provider.getLastRanking().getOrder().length;

          // the factory function call executes the score's implementation
          scorePlugin.factory(this.resolveArgs(), amountOfRows).then((params) => this.fire(LineUpRankingButtons.EVENT_ADD_TRACKED_SCORE_COLUMN, scorePlugin.id, params));
        }
      },
      {
        text: 'Combining Columns',
        plugins: dynamicCombinations,
        action: lineUpAction
      },
      ...metaDataOptions
    ];

    const elements: (IFormElementDesc)[] = [{
      type: FormElementType.SELECT2,
      id: FORM_ID_ADDITIONAL_COLUMN,
      attributes: {
        style: 'width:250px'
      },
      hideLabel: true,
      options: {
        data: columnsWrapper.map((category) => {
          return {
            text: category.text,
            children: category.plugins.map((entry) => {
              return { text: entry.text, id: `${category.text}-${entry.id}` };
            })
          };
        }),
        onChange: () => {
          const select = builder.getElementById(FORM_ID_ADDITIONAL_COLUMN);
          const result = select.value;

          select.value = null;
          const [category, scoreID] = result.id.split('-');
          const chosenCategory = columnsWrapper.find((cat) => cat.text === category);

          const plugin = chosenCategory.plugins.find((child) => child.id === scoreID);

          chosenCategory.action(plugin);

          // close dropdown after selection
          $($dropdownLi.select('.dropdown-toggle').node()).dropdown('toggle');
        }
      }
    }];

    builder.build(elements);

    // HACK: don't close the dropdown when the dropdown itself or Select2 is clicked
    $selectWrapper.on('click', () => (<Event>d3.event).stopPropagation());

    $($dropdownLi.node()).on('shown.bs.dropdown', () => {
      // show Select2 options by default when the dropdown is visible to have Select2 calculate the correct position
      builder.getElementById(FORM_ID_ADDITIONAL_COLUMN).focus();

      // HACK: keep dropdown open even when the input element inside Select2 is clicked
      // this EventListener can only be applied when the dropdown is shown, because otherwise the element does not exist
      $('.select2-search__field').on('click', (e) => e.stopPropagation());
    });
  }

  private appendExtraButtons() {
    const buttons = <IRankingButtonExtensionDesc[]>listPlugins(EXTENSION_POINT_TDP_RANKING_BUTTON);
    buttons.forEach((button) => {
      const listener = () => {
        (<Event>d3.event).preventDefault();
        (<Event>d3.event).stopPropagation();
        button.load().then((p) => this.scoreColumnDialog(p));
      };
      this.createMarkup(button.name,'fa ' + button.cssClass, listener);
    });
  }

  private buildMetaDataDescriptions(desc: IScoreLoaderExtensionDesc, columns: IScoreLoader[]) {
    return {
      text: desc.name,
      plugins: columns,
      action: (plugin: IScoreLoader) => {
        // number of rows of the last ranking
        const amountOfRows: number = this.provider.getLastRanking().getOrder().length;

        const params = plugin.factory(this.resolveArgs(), amountOfRows);
        this.fire(LineUpRankingButtons.EVENT_ADD_TRACKED_SCORE_COLUMN, plugin.scoreId, params);
      }
    };
  }

  private scoreColumnDialog(scorePlugin: IRankingButtonExtension) {
    //TODO clueify
    // pass dataSource into InvertedAggregatedScore factory method
    Promise.resolve(scorePlugin.factory(scorePlugin.desc, this.idType, this.resolveArgs())) // open modal dialog
      .then((scoreImpl) => { // modal dialog is closed and score created
        if(Array.isArray(scoreImpl)) {
          scoreImpl.forEach((impl) => this.fire(LineUpRankingButtons.EVENT_ADD_SCORE_COLUMN, impl, scorePlugin));
        } else {
          this.fire(LineUpRankingButtons.EVENT_ADD_SCORE_COLUMN, scoreImpl, scorePlugin);
        }
      });
  }
}