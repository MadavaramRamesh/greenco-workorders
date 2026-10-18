const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../data/work_orders.csv');
const outJsonPath = path.resolve(__dirname, '../assets/workOrders.json');

const csvContent = fs.readFileSync(csvPath, 'utf8').trim();
const lines = csvContent.split(/\r?\n/);
const header = lines[0].split(',').map((h) => h.trim());

const originalOrders = lines.slice(1).map((line) => {
  const values = line.split(',').map((v) => v.trim());
  const entry = {};
  header.forEach((col, idx) => {
    entry[col] = values[idx];
  });
  entry.revision = Number(entry.revision);
  return entry;
});

const syntheticOrders = [
  {
    wo_id: 'WO-1005',
    asset_id: 'WTG-103',
    title: 'Yaw motor replacement',
    priority: 'Critical',
    status: 'Open',
    assigned_to: 'Technician B',
    due_date: '2026-10-15',
    updated_at: '2026-10-14T12:00:00Z',
    revision: 1,
  },
  {
    wo_id: 'WO-1006',
    asset_id: 'INV-202',
    title: 'DC bus capacitor testing',
    priority: 'High',
    status: 'In Progress',
    assigned_to: 'Technician C',
    due_date: '2026-10-25',
    updated_at: '2026-10-15T09:00:00Z',
    revision: 1,
  },
  {
    wo_id: 'WO-1007',
    asset_id: 'PMP-302',
    title: 'Coolant pump seal replacement',
    priority: 'Medium',
    status: 'Completed',
    assigned_to: 'Technician A',
    due_date: '2026-10-12',
    updated_at: '2026-10-15T10:30:00Z',
    revision: 2,
  },
  {
    wo_id: 'WO-1008',
    asset_id: 'WTG-104',
    title: 'Blade pitch sensor calibration',
    priority: 'Low',
    status: 'Open',
    assigned_to: 'Technician D',
    due_date: '2026-10-28',
    updated_at: '2026-10-15T14:00:00Z',
    revision: 1,
  },
  {
    wo_id: 'WO-1009',
    asset_id: 'INV-203',
    title: 'Firmware security patch',
    priority: 'Medium',
    status: 'Completed',
    assigned_to: 'Technician B',
    due_date: '2026-10-14',
    updated_at: '2026-10-16T08:15:00Z',
    revision: 1,
  },
  {
    wo_id: 'WO-1010',
    asset_id: 'PMP-303',
    title: 'Bearing thermal analysis',
    priority: 'Critical',
    status: 'In Progress',
    assigned_to: 'Technician A',
    due_date: '2026-10-20',
    updated_at: '2026-10-16T11:45:00Z',
    revision: 2,
  },
  {
    wo_id: 'WO-1011',
    asset_id: 'WTG-105',
    title: 'Anemometer diagnostic scan',
    priority: 'Low',
    status: 'In Progress',
    assigned_to: 'Technician C',
    due_date: '2026-10-24',
    updated_at: '2026-10-16T13:20:00Z',
    revision: 1,
  },
  {
    wo_id: 'WO-1012',
    asset_id: 'INV-204',
    title: 'Grid sync transformer check',
    priority: 'High',
    status: 'Open',
    assigned_to: 'Technician B',
    due_date: '2026-10-16',
    updated_at: '2026-10-16T15:00:00Z',
    revision: 1,
  },
  {
    wo_id: 'WO-1013',
    asset_id: 'PMP-304',
    title: 'Filter cartridge swap',
    priority: 'Low',
    status: 'Completed',
    assigned_to: 'Technician D',
    due_date: '2026-10-10',
    updated_at: '2026-10-16T16:30:00Z',
    revision: 3,
  },
  {
    wo_id: 'WO-1014',
    asset_id: 'WTG-106',
    title: 'Rotor brake pad inspection',
    priority: 'High',
    status: 'Open',
    assigned_to: 'Technician A',
    due_date: '2026-10-21',
    updated_at: '2026-10-17T09:00:00Z',
    revision: 1,
  },
];

const allOrders = [...originalOrders, ...syntheticOrders];

fs.writeFileSync(outJsonPath, JSON.stringify(allOrders, null, 2), 'utf8');
console.log(`Successfully written ${allOrders.length} work orders to ${outJsonPath}`);

