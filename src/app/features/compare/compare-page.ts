import { Component } from '@angular/core';
import { ComparisonTable } from '../../ui/comparison-table';
import { FormulaView } from '../../ui/formula';
import { SOTA_COMPARISON } from '../../data/comparison';
import { FORMULAS } from '../../data/formulas';

@Component({
  selector: 'app-compare-page',
  imports: [ComparisonTable, FormulaView],
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.scss',
})
export class ComparePage {
  readonly rows = SOTA_COMPARISON;
  readonly formulas = FORMULAS;
}
