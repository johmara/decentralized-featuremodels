import { Component, input } from '@angular/core';
import type { ComparisonRow } from '../core/model/feature-model.types';

@Component({
  selector: 'app-comparison-table',
  templateUrl: './comparison-table.html',
  styleUrl: './comparison-table.scss',
})
export class ComparisonTable {
  readonly rows = input.required<readonly ComparisonRow[]>();

  cellText(value: 'yes' | 'no' | 'partial'): string {
    return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'Partial';
  }
}
