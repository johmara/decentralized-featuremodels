import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import { TourAnchorRegistry } from './tour-anchor.registry';

/** Usage: `<div [appTourAnchor]="'capability-lane'">`. Registers/re-registers on id change, unregisters on destroy. */
@Directive({
  selector: '[appTourAnchor]',
})
export class TourAnchorDirective implements OnDestroy {
  readonly appTourAnchor = input.required<string>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly registry = inject(TourAnchorRegistry);
  private registeredId: string | null = null;

  private readonly syncRegistration = effect(() => {
    const id = this.appTourAnchor();
    if (this.registeredId && this.registeredId !== id) {
      this.registry.unregister(this.registeredId, this.elementRef);
    }
    this.registry.register(id, this.elementRef);
    this.registeredId = id;
  });

  ngOnDestroy(): void {
    if (this.registeredId) this.registry.unregister(this.registeredId, this.elementRef);
  }
}
