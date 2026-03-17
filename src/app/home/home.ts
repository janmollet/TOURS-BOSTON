import { Component, signal, inject } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import translationsESP from '../../../public/i18n/esp.json';
import translationsENG from '../../../public/i18n/en.json';
import { RouterLink } from "@angular/router";
@Component({
  selector: 'app-home',
  imports: [TranslatePipe,
    RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly title = signal('maps_info_tours');
  private translate = inject(TranslateService);

  constructor() {
    // Load translations once
    this.translate.setTranslation('en', translationsENG);
    this.translate.setTranslation('esp', translationsESP);

    // Set default + initial language
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  useLanguage(language: string): void {
    this.translate.use(language); // ✅ This switches language
  }
}
