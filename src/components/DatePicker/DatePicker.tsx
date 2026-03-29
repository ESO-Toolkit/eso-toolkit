'use client';
import { CalendarMonth as CalendarIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import React from 'react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  type DatePickerProps as AriaDatePickerProps,
  DateSegment,
  type DateValue,
  Dialog,
  Group,
  Heading,
  Popover,
  type ValidationResult,
} from 'react-aria-components';

import './DatePicker.css';

export interface DatePickerProps<T extends DateValue> extends AriaDatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage: _errorMessage,
  ...props
}: DatePickerProps<T>): React.JSX.Element {
  return (
    <AriaDatePicker {...props}>
      {label && <span className="eso-datepicker-label">{label}</span>}
      <Group className="eso-datepicker-group">
        <DateInput className="eso-datepicker-input">
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <AriaButton className="eso-datepicker-button">
          <CalendarIcon sx={{ fontSize: 16 }} />
        </AriaButton>
      </Group>
      {description && <span className="eso-datepicker-description">{description}</span>}
      <Popover className="eso-datepicker-popover">
        <Dialog>
          <Calendar>
            <header className="eso-calendar-header">
              <AriaButton slot="previous" className="eso-calendar-nav">
                <ChevronLeft sx={{ fontSize: 18 }} />
              </AriaButton>
              <Heading className="eso-calendar-heading" />
              <AriaButton slot="next" className="eso-calendar-nav">
                <ChevronRight sx={{ fontSize: 18 }} />
              </AriaButton>
            </header>
            <CalendarGrid>
              <CalendarGridHeader>{(_day) => <CalendarHeaderCell />}</CalendarGridHeader>
              <CalendarGridBody>{(date) => <CalendarCell date={date} />}</CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
