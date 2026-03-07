// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class AppService {
//   getHello(): string {
//     return 'Hello World!';
//   }
// }


import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  processData(data: any) {
    console.log('Backend received this data:', data);

    // Example: Logic to calculate something based on the frontend input
    const totalFlow = Number(data.inboundFlow) + Number(data.outboundFlow);
    
    // Whatever you return here goes back to your "data" variable in the frontend
    return {
      message: 'Scenario processed successfully',
      calculatedTotal: totalFlow,
      receivedAt: new Date().toISOString(),
    };
  }
}