import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveMp } from './interactive-mp';

describe('InteractiveMp', () => {
  let component: InteractiveMp;
  let fixture: ComponentFixture<InteractiveMp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveMp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InteractiveMp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
