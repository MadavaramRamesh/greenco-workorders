import { WorkOrder, WorkOrderSource } from '../domain/types';
import seedOrders from '../../assets/workOrders.json';

export class JsonSeedSource implements WorkOrderSource {
  private readonly orders: WorkOrder[];

  constructor(customOrders?: WorkOrder[]) {
    this.orders = customOrders ?? (seedOrders as WorkOrder[]);
  }

  async fetchAll(): Promise<WorkOrder[]> {
    return this.orders;
  }
}

