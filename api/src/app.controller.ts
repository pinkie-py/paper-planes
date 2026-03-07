import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // This tells NestJS to listen for POST requests at http://localhost:5000/load-scenario
  @Post('load-scenario')
  handleLoadScenario(@Body() formData: any) {
    // We send the data to the Service to be processed
    return this.appService.processData(formData);
  }
}