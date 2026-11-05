import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, calculateCommission, csvCell, partnerLead } from '../lib/domain.ts';
test('Israeli numbers normalize to a unique key', () => {
  assert.equal(normalizePhone('+972 (50) 123-4567'), '0501234567');
  assert.equal(normalizePhone('050-123-4567'), '0501234567');
  assert.equal(normalizePhone('021234567'), '021234567');
  assert.equal(normalizePhone('12345'), null);
});
test('unset commission stays unknown, including after payment', () => {
  assert.equal(calculateCommission('unset', null, 800000), null);
  assert.equal(calculateCommission('fixed', 100000, 800000), 100000);
  assert.equal(calculateCommission('percentage', 1250, 800000), 100000);
  assert.equal(calculateCommission('percentage', 1250, 12345), 1543);
});
test('partner projection removes internal notes and fee information', () => {
  const projected = partnerLead({ phone: '0501234567', notes: 'private', feeReceived: 800000, commissionRule: 'internal', commissionAmount: 100000 });
  assert.equal(projected.phone, '••• 4567');
  assert.equal(projected.notes, '');
  assert.equal(projected.feeReceived, 0);
  assert.equal(projected.commissionRule, null);
  assert.equal(projected.commissionAmount, 100000);
});
test('CSV quotes values and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('קשר'), '"קשר"');
});
