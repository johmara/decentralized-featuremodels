import { Component, input } from '@angular/core';
import type { Formula } from '../data/formulas';

/** Renders one formula as Unicode math with a plain-text aria-label fallback — no KaTeX dependency for six formulas. */
@Component({
  selector: 'app-formula',
  templateUrl: './formula.html',
  styleUrl: './formula.scss',
})
export class FormulaView {
  readonly formula = input.required<Formula>();
}
