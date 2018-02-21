import { Component, OnChanges, OnDestroy, ElementRef, Input, SimpleChanges } from '@angular/core';
import { NV_COMPONENS, IGNORED_OPTIONS } from './constants'
import * as d3 from 'd3';
import * as nv from 'nvd3';

@Component({
  selector: 'nvd3',
  template: ``
})
export class NvD3Component implements OnChanges, OnDestroy {
  @Input() options: any;
  @Input() data: any;
  el: HTMLElement;
  chart: any;
  chartType: string;
  svg: any;

  constructor(
    elementRef: ElementRef
  ) {
    this.el = elementRef.nativeElement;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.options) {
      if (!this.chart || this.chartType !== this.options.chart.type) {
        this.initChart(this.options);
      } else {
        if (this.options) {
          this.updateWithOptions(this.options);
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.clearElement();
  }

  initChart(options) {
    // Clearing
    this.clearElement();

    if (!options) return;

    // Initialize chart with specific type
    this.chart = nv.models[options.chart.type]();
    this.chartType = this.options.chart.type;

    // Generate random chart ID
    this.chart.id = Math.random().toString(36).substr(2, 15);

    this.updateWithOptions(options);

    nv.addGraph(() => {
      if (!this.chart) return;

      // Remove resize handler. Due to async execution should be placed here, not in the clearElement
      if (this.chart.resizeHandler) {
        this.chart.resizeHandler.clear();
      }

      // Update the chart when window resizes
      this.chart.resizeHandler = nv.utils.windowResize(() => {
        this.chart && this.chart.update && this.chart.update();
      });

      return this.chart;
    }, options.chart['callback']);
  }

  /**
   * Update chart with new options.
   * @param options
   */
  updateWithOptions(options) {
    for (let key in this.chart) {
      if (!this.chart.hasOwnProperty(key)) continue;

      if (key[0] !== '_' && (IGNORED_OPTIONS.indexOf(key) < 0) && options.chart[key]) {
        if (key === 'dispatch') {
          this.configureEvents(this.chart[key], options.chart[key]);
        }
        else if (NV_COMPONENS.indexOf(key) >= 0 || (key === 'stacked' && this.chartType === 'stackedAreaChart')) {
          // stacked is a component for stackedAreaChart, but a boolean for multiBarChart and multiBarHorizontalChart
          this.configure(this.chart[key], options.chart[key], this.chartType);
        }
        else {
          this.chart[key](options.chart[key]);
        }
      }
    }
    this.updateWithData(this.data);
  }

  /**
   * Update chart with new data.
   * @param data
   */
  updateWithData(data) {
    if (data) {
      // Select the add <svg> element (create it if necessary) and to render the chart in
      const svgElement = this.el.querySelector('svg');
      if (!svgElement) {
        this.svg = d3.select(this.el).append('svg');
      } else {
        this.svg = d3.select(svgElement);
      }
      this.updateSize();
      this.svg.datum(data).call(this.chart);
    }
  }

  /**
   * Update the chart size.
   */
  updateSize() {
    if (this.svg) {
      let h, w;
      if (h = this.options.chart.height) {
        if (!isNaN(+h)) {
          h += 'px'
        };
        this.svg.attr('height', h).style({ height: h });
      }
      if (w = this.options.chart.width) {
        if (!isNaN(+w)) {
          w += 'px';
        }
        this.svg.attr('width', w).style({ width: w });
      } else {
        this.svg.attr('width', '100%').style({ width: '100%' });
      }
    }
  }

  /**
   * Synchronize the options with the options of the nvd3 chart.
   * @param chart
   * @param options
   * @param chartType
   */
  configure(chart, options, chartType) {
    if (chart && options) {

      for (let key in chart) {
        if (!chart.hasOwnProperty(key)) continue;

        let value = chart[key];

        if (key[0] === '_') {
        }
        else if (key === 'dispatch') {
          this.configureEvents(value, options[key]);
        }
        else if (key === 'tooltip') {
          this.configure(value, options[key], chartType);
        }
        else if (key === 'contentGenerator') {
          if (options[key]) {
            value(options[key])
          };
        }
        else if (([
          'axis',
          'clearHighlights',
          'defined',
          'highlightPoint',
          'nvPointerEventsClass',
          'options',
          'rangeBand',
          'rangeBands',
          'scatter',
          'open',
          'close'
        ].indexOf(key) === -1) && options[key]) {
          value(options[key]);
        }
      }
    }
  }

  /**
   * Configure dispatch events.
   * @param dispatch
   * @param options
   */
  configureEvents(dispatch, options) {
    if (dispatch && options) {
      for (let key in dispatch) {
        if (dispatch.hasOwnProperty(key) && options[key]) {
          dispatch.on(key + '._', options[key]);
        }
      }
    }
  }

  /**
   * Cleanup an element.
   */
  clearElement() {
    this.el.innerHTML = '';

    // remove tooltip if exists
    if (this.chart && this.chart.tooltip && this.chart.tooltip.id) {
      d3.selectAll('.nvtooltip').remove();
      d3.select('#' + this.chart.tooltip.id()).remove();
    }

    // To be compatible with old nvd3 (v1.7.1)
    if (nv['graphs'] && this.chart) {
      for (var i = nv['graphs'].length - 1; i >= 0; i--) {
        if (nv['graphs'][i] && (nv['graphs'][i].id === this.chart.id)) {
          nv['graphs'].splice(i, 1);
        }
      }
    }
    if (nv.tooltip && nv.tooltip.cleanup) {
      nv.tooltip.cleanup();
    }
    if (this.chart && this.chart.resizeHandler) {
      this.chart.resizeHandler.clear();
    }
    this.chart = null;
  }
}

