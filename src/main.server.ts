import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { enableProdMode } from '@angular/core';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import { env } from '../config/env';

if (env.NODE_ENV === 'production') {
	enableProdMode();
}

const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, config, context);

export default bootstrap;
