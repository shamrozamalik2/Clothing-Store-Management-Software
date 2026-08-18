import client from './client';

export const employeesApi = {
  list:              (params)      => client.get('/employees', { params }),
  getOne:            (id)          => client.get(`/employees/${id}`),
  create:            (data)        => client.post('/employees', data),
  update:            (id, data)    => client.put(`/employees/${id}`, data),
  remove:            (id)          => client.delete(`/employees/${id}`),
  // Salary
  listSalaries:      (params)      => client.get('/employees/salaries', { params }),
  processSalaries:   (data)        => client.post('/employees/salaries/process', data),
  paySalary:         (id, data)    => client.put(`/employees/salaries/${id}/pay`, data),
  // Attendance
  getAttendance:     (id, params)  => client.get(`/employees/${id}/attendance`, { params }),
  markAttendance:    (id, data)    => client.post(`/employees/${id}/attendance`, data),
  attendanceSummary: (params)      => client.get('/employees/attendance/summary', { params }),
};
