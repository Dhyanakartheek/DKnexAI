import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { provideMarkdown, CLIPBOARD_OPTIONS, ClipboardButtonComponent } from 'ngx-markdown';
import { SecurityContext } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimations(),
    provideMarkdown({
      sanitize: SecurityContext.NONE,
      clipboardOptions: {
        provide: CLIPBOARD_OPTIONS,
        useValue: {
          buttonComponent: ClipboardButtonComponent
        }
      }
    }),
    importProvidersFrom(MonacoEditorModule.forRoot({ baseUrl: '/assets/monaco/min' }))
  ]
};
