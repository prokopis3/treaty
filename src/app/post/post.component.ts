import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

const fb = new FormBuilder();

@Component({
    selector: 'app-post',
    imports: [ReactiveFormsModule, JsonPipe],
    templateUrl: './post.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PostComponent {
  private api = inject(HttpClient);

  post = input();

  title = 'treaty';

  public testjson = {
    strField: 'string value',
    numbField: 12,
  };
  form = fb.group({
    strField: fb.control('', Validators.required),
    numbField: fb.control<number | null>(null),
  });

  async submit() {
    if (this.form.invalid) return;

    const res = this.api
      .post(
        '/api/form',
        this.form.value as {
          strField: string;
          numbField: number;
        }
      )
      .subscribe((res) => console.log('res: ', res));
  }
}
