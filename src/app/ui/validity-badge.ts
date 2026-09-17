import { Component, input } from '@angular/core';

@Component({
  selector: 'app-validity-badge',
  templateUrl: './validity-badge.html',
  styleUrl: './validity-badge.scss',
})
export class ValidityBadge {
  readonly valid = input.required<boolean>();
  readonly validLabel = input('Valid');
  readonly invalidLabel = input('Invalid');
}
