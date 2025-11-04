'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';

// Define the shape of the data the chart expects
export type ChartData = {
  name: string;
  score: number;
};

interface PerformanceChartProps {
  data: ChartData[];
}

// Custom tooltip for better readability
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground">{payload[0].payload.name}</p>
        <p className="text-sm text-muted-foreground">
          Score: <span className="font-bold text-foreground">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--foreground))"
          fontSize={13}
          tickLine={false}
          axisLine={false}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="hsl(var(--foreground))"
          fontSize={13}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="score"
          fill="hsl(var(--foreground))"
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        >
          <LabelList
            dataKey="score"
            position="top"
            formatter={(value: any) => `${value}%`}
            style={{ fill: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 'bold' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
