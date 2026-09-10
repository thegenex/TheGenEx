/**
 * Dashboard.gs — aggregated read-only data for the admin dashboard.
 * Reads each sheet once per request (not per metric) to minimize spreadsheet ops.
 */

function getDashboardOverview_() {
  const leads = readAllRows_(SHEET_LEADS).rows;
  const visitors = readAllRows_(SHEET_VISITORS).rows;
  const pageviews = readAllRows_(SHEET_PAGEVIEWS).rows;

  const totalVisitors = visitors.length;
  const todayVisitors = visitors.filter(function (v) { return isToday_(v.first_visit) || isToday_(v.last_visit); }).length;
  const totalPageViews = pageviews.length;
  const todayPageViews = pageviews.filter(function (p) { return isToday_(p.timestamp); }).length;
  const totalLeads = leads.length;
  const todayLeads = leads.filter(function (l) { return isToday_(l.created_at); }).length;
  const convertedLeads = leads.filter(function (l) { return l.status === 'Converted'; }).length;
  const conversionRate = totalVisitors > 0 ? Number(((totalLeads / totalVisitors) * 100).toFixed(2)) : 0;
  const leadConversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

  return ok_({
    totalVisitors: totalVisitors,
    todayVisitors: todayVisitors,
    totalPageViews: totalPageViews,
    todayPageViews: todayPageViews,
    totalLeads: totalLeads,
    todayLeads: todayLeads,
    convertedLeads: convertedLeads,
    conversionRate: conversionRate, // leads / visitors
    leadConversionRate: leadConversionRate, // converted / total leads
  });
}

function rangeStartFor_(range) {
  switch (range) {
    case 'today': return daysAgo_(0);
    case '7d': return daysAgo_(6);
    case '30d': return daysAgo_(29);
    default: return null; // all time
  }
}

function dayKey_(date) {
  const d = new Date(date);
  return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
}

function bucketByDay_(items, dateField, start) {
  const counts = {};
  items.forEach(function (item) {
    const d = new Date(item[dateField]);
    if (isNaN(d.getTime())) return;
    if (start && d < start) return;
    const key = dayKey_(d);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).sort().map(function (k) { return { date: k, count: counts[k] }; });
}

function getDashboardAnalytics_(range) {
  range = range || '30d';
  const start = rangeStartFor_(range);

  const visitors = readAllRows_(SHEET_VISITORS).rows;
  const pageviews = readAllRows_(SHEET_PAGEVIEWS).rows;
  const leads = readAllRows_(SHEET_LEADS).rows;

  const dailyVisitors = bucketByDay_(visitors, 'first_visit', start);
  const dailyPageViews = bucketByDay_(pageviews, 'timestamp', start);
  const dailyLeads = bucketByDay_(leads, 'created_at', start);

  const pageCounts = {};
  pageviews.forEach(function (p) {
    if (start && new Date(p.timestamp) < start) return;
    const page = p.page || 'unknown';
    pageCounts[page] = (pageCounts[page] || 0) + 1;
  });
  const popularPages = Object.keys(pageCounts)
    .map(function (page) { return { page: page, count: pageCounts[page] }; })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, 10);

  const filteredVisitors = start ? visitors.filter(function (v) { return new Date(v.first_visit) >= start; }) : visitors;
  const filteredLeads = start ? leads.filter(function (l) { return new Date(l.created_at) >= start; }) : leads;
  const conversion = filteredVisitors.length > 0
    ? Number(((filteredLeads.length / filteredVisitors.length) * 100).toFixed(2))
    : 0;

  return ok_({
    range: range,
    dailyVisitors: dailyVisitors,
    dailyPageViews: dailyPageViews,
    dailyLeads: dailyLeads,
    popularPages: popularPages,
    conversion: conversion,
  });
}
