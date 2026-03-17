import { Component, signal, inject } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import translationsESP from '../../public/i18n/esp.json';
import translationsENG from '../../public/i18n/en.json';
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [RouterOutlet]
})
export class App {
  
}
