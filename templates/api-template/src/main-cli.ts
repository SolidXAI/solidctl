#!/usr/bin/env node

import 'dotenv/config';
import { bootstrapSolidCli } from '@solidxai/core';
import { AppModule } from './app.module';

bootstrapSolidCli(() => AppModule.forRoot());