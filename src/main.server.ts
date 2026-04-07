import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { enableProdMode } from '@angular/core';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

if (process.env['NODE_ENV'] === 'production') {
	enableProdMode();
}

const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, config, context);

export default bootstrap;
