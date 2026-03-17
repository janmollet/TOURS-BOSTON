import { Routes } from '@angular/router';
import { Home } from './home/home';
import { InteractiveMp } from './interactive-mp/interactive-mp';

export const routes: Routes = [
    {
        path: 'interactive-mp',
        component: InteractiveMp
    },
    {
        path: '',
        component: Home
    }
];
