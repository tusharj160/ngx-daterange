import { Component, ElementRef, Input, Output, EventEmitter, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { defaultDateRangePickerOptions, defaultDateRanges, defaultDateFormat, defaultTimeFormat } from '../constants';
import { IDateRange, IDateRangePickerOptions, IDefinedDateRange, IChangedData } from '../../interfaces';

import * as momentNs from 'moment'; const moment = momentNs;

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'date-range-picker',
  styleUrls: [
    './date-range-picker.component.scss',
  ],
  templateUrl: './date-range-picker.component.html',
})
export class DateRangePickerComponent implements OnInit {

  @Input()
  options: IDateRangePickerOptions = defaultDateRangePickerOptions;

  @Input()
  class: string;

  @Input()
  controlName: string = 'dateRange';

  @Input()
  parentFormGroup: FormGroup = null;

  @Output()
  rangeSelected = new EventEmitter<IDateRange>();

  showCalendars = false;
  enableApplyButton = false;
  areOldDatesStored = false;
  fromDate: momentNs.Moment;
  toDate: momentNs.Moment;
  tempFromDate: momentNs.Moment;
  tempToDate: momentNs.Moment;
  oldFromDate: momentNs.Moment;
  oldToDate: momentNs.Moment;
  fromMonth: number;
  toMonth: number;
  fromYear: number;
  toYear: number;
  format: string;
  range = '';
  defaultRanges: IDefinedDateRange[];

  @HostListener('document:click', ['$event'])
  handleClick(event: Event) {
    if (this.elementRef.nativeElement.contains(event.target)) {
      this.toggleCalendars(true);
    }
  }

  constructor(
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // get default options provided by user
    this.setFormat();
    this.validateMinMaxDates();
    this.setFromDate(this.options.startDate);
    this.setToDate(this.options.endDate);
    this.defaultRanges = this.validatePredefinedRanges(this.options.preDefinedRanges || defaultDateRanges.ranges);

    // update calendar grid
    this.updateCalendar();

    // add form control to parent form group
    if (this.parentFormGroup) {
      const control = new FormControl('', this.options.validators);

      if (this.options.disabled) {
        control.disable();
      }

      this.parentFormGroup.addControl(this.controlName, control);
    }
  }

  checkChrome(): string {
    return window['chrome'] ? 'is-chrome' : '';
  }

  toggleCalendars(value: boolean): void {
    this.showCalendars = value;

    if (!value) {
      this.areOldDatesStored = false;
      this.updateCalendar();
    }
  }

  updateCalendar() {
    // get month and year to show calendar
    const fromDate = this.fromDate || this.tempFromDate;
    const toDate = this.toDate || this.tempToDate;

    let tDate = moment(fromDate, this.format);

    this.fromMonth = tDate.get('month');
    this.fromYear = tDate.get('year');

    tDate = moment(toDate, this.format);
    this.toMonth = tDate.get('month');
    this.toYear = tDate.get('year');

    this.setRange();
  }

  getPositionClass(): string {
    let positionClass = 'open-left';

    if (this.options.position === 'right') {
      positionClass = 'open-right';
    }

    if (this.options.position === 'center' && !this.options.singleCalendar) {
      positionClass = 'open-center';
    }

    return positionClass;
  }

  setFormat() {
    if (this.options) {
      this.format = this.options.format || defaultDateFormat;
    }
    else {
      this.format = defaultDateFormat;
    }
  }

  validateMinMaxDates() {
    if (this.options) {
      // only mindate is suppplied
      if (this.options.minDate && !this.options.maxDate) {
        this.options.minDate = this.getMoment(this.options.minDate);
      }

      // only maxdate is supplied
      if (!this.options.minDate && this.options.maxDate) {
        this.options.maxDate = this.getMoment(this.options.maxDate);
      }

      // both min and max dates are supplied
      if (this.options.minDate && this.options.maxDate) {
        this.options.minDate = this.getMoment(this.options.minDate);
        this.options.maxDate = this.getMoment(this.options.maxDate);

        if (this.options.maxDate.isBefore(this.options.minDate, 'date')) {
          this.options.minDate = null;
          this.options.maxDate = null;
          console.warn('Supplied minDate is after maxDate. Discarding options for minDate and maxDate.');
        }
      }

      if (this.options.minDate && (this.options.minDate as momentNs.Moment).format(defaultTimeFormat) === '00:00') {
        (this.options.minDate as momentNs.Moment).set({
          hour: 0,
          minutes: 0,
          seconds: 0
        });
      }

      if (this.options.maxDate && (this.options.maxDate as momentNs.Moment).format(defaultTimeFormat) === '00:00') {
        (this.options.maxDate as momentNs.Moment).set({
          hour: 23,
          minutes: 59,
          seconds: 59
        });
      }
    }
  }

  setFromDate(value) {
    if (this.options.noDefaultRangeSelected && !value) {
      this.fromDate = null;
      this.tempFromDate = this.getActualFromDate(value);
    }
    else {
      this.fromDate = this.getActualFromDate(value);
    }
  }

  getActualFromDate(value) {
    let temp;

    if (temp = this.getValidateMoment(value)) {
      return this.getValidateFromDate(temp);
    }
    else {
      return this.getValidateFromDate(moment());
    }
  }

  getValidateFromDate(value) {
    if (!this.options.timePickerOptions) {
      if (this.options.minDate && this.options.maxDate && value.isSameOrAfter(this.options.minDate, 'date') && value.isSameOrBefore(this.options.maxDate, 'date')) {
        return value;
      }
      else if (this.options.minDate && !this.options.maxDate && value.isAfter(this.options.minDate, 'date')) {
        return value;
      }
      else if (this.options.minDate) {
        return (this.options.minDate as momentNs.Moment).clone();
      }
      else {
        return moment();
      }
    }
    else {
      if (this.options.minDate && this.options.maxDate && value.isSameOrAfter(this.options.minDate, this.options.format) && value.isSameOrBefore(this.options.maxDate, this.options.format)) {
        return value;
      }
      else if (this.options.minDate && !this.options.maxDate && value.isAfter(this.options.minDate, this.options.format)) {
        return value;
      }
      else if (this.options.minDate) {
        return (this.options.minDate as momentNs.Moment).clone();
      }
      else {
        return moment();
      }
    }
  }

  setToDate(value: momentNs.Moment): void {
    if (this.options.noDefaultRangeSelected && !value) {
      this.toDate = null;
      this.tempToDate = this.getActualToDate(value);
    }
    else {
      this.toDate = this.getActualToDate(value);
    }
  }

  getActualToDate(value: momentNs.Moment): momentNs.Moment {
    let temp;

    if (temp = this.getValidateMoment(value)) {
      return this.getValidateToDate(temp);
    }
    else {
      return this.getValidateToDate(moment());
    }
  }

  getValidateToDate(value: momentNs.Moment): momentNs.Moment {
    const granularity = this.options.timePickerOptions ? null : 'date';

    if (this.options.maxDate && value.isSameOrAfter(this.fromDate, granularity), value.isSameOrBefore(this.options.maxDate, granularity)) {
      return value;
    }
    else if (this.options.maxDate) {
      return (this.options.maxDate as momentNs.Moment).clone();
    }
    else {
      return moment();
    }
  }

  // detects which date to set from or to and validates
  dateChanged(data: IChangedData): void {
    const value = data.day;
    const isLeft = data.isLeft;

    if (isLeft) {
      if (!this.options.timePickerOptions) {
        value.set({
          hour: 0,
          minute: 0,
          second: 0
        });
      }

      this.fromDate = value;

      if (!this.options.timePickerOptions) {
        if (value.isAfter(this.toDate, 'date')) {
          this.toDate = this.fromDate.clone();
        }
      }
      else {
        if (value.isAfter(this.toDate)) {
          this.toDate = this.fromDate.clone();
        }
      }
    }
    else {
      if (!this.options.timePickerOptions) {
        value.set({
          hour: 23,
          minute: 59,
          second: 59
        });
      }

      this.toDate = value;

      if (!this.options.timePickerOptions) {
        if (value.isBefore(this.fromDate, 'date')) {
          this.fromDate = this.toDate.clone();
        }
      }
      else {
        if (value.isBefore(this.fromDate)) {
          this.fromDate = this.toDate.clone();
        }
      }
    }

    if (this.isAutoApply()) {
      if (this.options.singleCalendar || !isLeft) {
        this.toggleCalendars(false);
        this.setRange();
        this.emitRangeSelected();
      }
    }
    else if (!this.options.singleCalendar && !isLeft) {
      this.enableApplyButton = true;
    }
    else if (this.options.singleCalendar) {
      this.enableApplyButton = true;
    }

    this.fromMonth = this.fromDate ? this.fromDate.get('month') : this.fromMonth;
    this.toMonth = this.toDate ? this.toDate.get('month') : this.toMonth;
  }

  emitRangeSelected(): void {
    let data: IDateRange;

    if (this.options.singleCalendar) {
      data = {
        start: this.getMoment(this.fromDate)
      };
    }
    else {
      data = {
        start: this.getMoment(this.fromDate),
        end: this.getMoment(this.toDate)
      };
    }

    this.rangeSelected.emit(data);
  }

  getMoment(value): momentNs.Moment {
    return moment(value, this.format);
  }

  getValidateMoment(value): momentNs.Moment | null {
    let momentValue = null;

    if (moment(value, this.format, true).isValid()) {
      momentValue = moment(value, this.format, true);
    }

    return momentValue;
  }

  setRange(): void {
    const displayFormat = this.options.displayFormat !== undefined ? this.options.displayFormat : this.format;

    if (this.options.singleCalendar && this.fromDate) {
      this.range = this.fromDate.format(displayFormat);
    }
    else if (this.fromDate && this.toDate) {
      this.range = `${ this.fromDate.format(displayFormat) } - ${ this.toDate.format(displayFormat) }`;
    }
    else {
      this.range = '';
    }

    if (this.parentFormGroup) {
      const control = this.parentFormGroup.get(this.controlName);

      if (control) {
        control.setValue(this.range);
      }
    }
  }

  formatFromDate(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (this.fromDate && target.value !== this.fromDate.format(this.format)) {
      this.dateChanged({
        day: target.value ? this.getMoment(target.value) : moment(),
        isLeft: true
      });
    }
  }

  formatToDate(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (this.toDate && target.value !== this.toDate.format(this.format)) {
      this.dateChanged({
        day: target.value ? this.getMoment(target.value) : moment(),
        isLeft: false
      });
    }
  }

  monthChanged(data: IChangedData): void {
    let temp;

    if (data.isLeft) {
      temp = moment([this.fromYear, this.fromMonth]).add(data.value, 'months');
      this.fromMonth = temp.get('month');
      this.fromYear = temp.get('year');
    }
    else {
      temp = moment([this.toYear, this.toMonth]).add(data.value, 'months');
      this.toMonth = temp.get('month');
      this.toYear = temp.get('year');
    }
  }

  yearChanged(data: IChangedData): void {
    let temp;

    if (data.isLeft) {
      temp = moment([this.fromYear, this.fromMonth]).add(data.value, 'year');
      this.fromMonth = temp.get('month');
      this.fromYear = temp.get('year');
    }
    else {
      temp = moment([this.toYear, this.toMonth]).add(data.value, 'year');
      this.toMonth = temp.get('month');
      this.toYear = temp.get('year');
    }
  }

  storeOldDates(): void {
    if (!this.areOldDatesStored) {
      this.oldFromDate = this.fromDate;
      this.oldToDate = this.toDate;
      this.areOldDatesStored = true;
    }
  }

  restoreOldDates(): void {
    this.fromDate = this.oldFromDate;
    this.toDate = this.oldToDate;
  }

  apply(): void {
    this.toggleCalendars(false);
    this.setRange();
    this.emitRangeSelected();
  }

  cancel(event: Event): void {
    this.toggleCalendars(false);
    this.restoreOldDates();

    event.stopPropagation();
  }

  clear(event: Event): void {
    this.fromDate = null;
    this.toDate = null;
    this.enableApplyButton = false;
    this.setRange();
    this.emitRangeSelected();

    event.stopPropagation();
  }

  applyPredefinedRange(data: IDefinedDateRange): void {
    this.setFromDate(data.value.start);
    this.setToDate(data.value.end);
    this.toggleCalendars(false);
    this.emitRangeSelected();
  }

  validatePredefinedRanges(ranges: IDefinedDateRange[]): IDefinedDateRange[] {
    return ranges.filter(range => {
      if (range.value.start.isAfter(range.value.end, 'date')) {
        return false;
      }

      if (this.options.minDate && range.value.start.isBefore(this.options.minDate)) {
        return false;
      }

      if (this.options.maxDate && range.value.end.isAfter(this.options.maxDate)) {
        return false;
      }

      return true;
    });
  }

  isAutoApply(): boolean {
    if (this.options.timePickerOptions) {
      return false;
    }
    else if (this.options.singleCalendar) {
      return true;
    }
    else {
      return this.options.autoApply;
    }
  }
}
