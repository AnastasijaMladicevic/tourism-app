import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">Prijavljivanje...</div>`,
})
export class GoogleCallbackComponent implements OnInit {
  ngOnInit(): void {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (idToken && window.opener) {
      window.opener.postMessage(
        { type: 'google-id-token', idToken },
        window.location.origin,
      );
    }

    window.close();
  }
}
