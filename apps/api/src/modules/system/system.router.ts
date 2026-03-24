import { Router, type IRouter } from 'express';
import * as HealthController from './health.controller.js';

export const systemRouter: IRouter = Router();

systemRouter.get('/health', HealthController.healthCheck);
