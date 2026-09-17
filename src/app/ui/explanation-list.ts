import { Component, input } from '@angular/core';
import type { Explanation } from '../core/engine/explain';

/** Renders a list of engine Explanations. Components never build these strings themselves. */
@Component({
  selector: 'app-explanation-list',
  templateUrl: './explanation-list.html',
  styleUrl: './explanation-list.scss',
})
export class ExplanationList {
  readonly explanations = input.required<readonly Explanation[]>();
  readonly emptyText = input('No issues.');
}
