import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';


export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendInvite(email: string, inviteUrl: string) {
    await this.transporter.sendMail({
      from: '"AutoSplit" <no-reply@autosplit.app>',
      to: email,
      subject: 'You are invited to a trip',
      html: `
        <p>You have been invited to join a trip.</p>
        <a href="${inviteUrl}">Accept Invite</a>
      `,
    });
  }

}