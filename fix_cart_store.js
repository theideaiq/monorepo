const fs = require('node:fs');
const file = 'apps/web/src/stores/cart-store.test.ts';
let content = fs.readFileSync(file, 'utf8');

const apple = `{ id: '1', productId: 'p1', title: 'apple', price: 1, image: 'a.png', quantity: 1 }`;
const banana = `{ id: '2', productId: 'p2', title: 'banana', price: 1, image: 'b.png', quantity: 1 }`;
const persistent = `{ id: '3', productId: 'p3', title: 'persistent-item', price: 1, image: 'p.png', quantity: 1 }`;

content = content.replace("addItem('apple');", `addItem(${apple});`);
content = content.replace("expect(useCartStore.getState().items).toEqual(['apple']);", `expect(useCartStore.getState().items).toEqual([${apple}]);`);

content = content.replace("addItem('banana');", `addItem(${banana});`);
content = content.replace("expect(useCartStore.getState().items).toEqual(['apple', 'banana']);", `expect(useCartStore.getState().items).toEqual([${apple}, ${banana}]);`);

content = content.replace("addItem('apple');", `addItem(${apple});`);
content = content.replace("addItem('banana');", `addItem(${banana});`);

content = content.replace("removeItem('apple');", "removeItem('1');");
content = content.replace("expect(useCartStore.getState().items).toEqual(['banana']);", `expect(useCartStore.getState().items).toEqual([${banana}]);`);

content = content.replace("addItem('apple');", `addItem(${apple});`);
content = content.replace("addItem('banana');", `addItem(${banana});`);

content = content.replace("addItem('apple');", `addItem(${apple});`);
content = content.replace("addItem('apple');", `addItem(${apple});`);
content = content.replace("expect(useCartStore.getState().items).toEqual(['apple', 'apple']);", `expect(useCartStore.getState().items).toEqual([{...${apple}, quantity: 2}]);`);

content = content.replace("removeItem('apple');", "removeItem('1');");

content = content.replace("addItem('persistent-item');", `addItem(${persistent});`);
content = content.replace("expect(parsed.state.items).toEqual(['persistent-item']);", `expect(parsed.state.items).toEqual([${persistent}]);`);

fs.writeFileSync(file, content);
