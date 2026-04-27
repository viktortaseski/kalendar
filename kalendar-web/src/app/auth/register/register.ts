import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const retypePassword = group.get('retypePassword')?.value;
  return password === retypePassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      retypePassword: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: passwordsMatch }
  );

  onSubmit() {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload = this.form.getRawValue();

    this.auth.register(payload).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || 'Registration failed. Please try again.');
      },
    });
  }
}
