import { ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../api.service';

export const resolvePost = {
  post: (route: ActivatedRouteSnapshot) =>
    inject(ApiService)
      .client.id[route.params['id']]
      .get()
      .pipe(
        map((test) => {
          console.log(' ');
          console.log('Post resolver', test);
          console.log(' ');

          return test.data;
        })
      ),
};
