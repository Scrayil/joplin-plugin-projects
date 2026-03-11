const total = 5;
for(let i=0; i<total; i++) {
  if (i < total - 1) {
    console.log(`adding border for i=${i}`);
  }
}
// For empty list, subTasks.length = 0, remainingRows = 5.
// i = 0,1,2,3 -> border
// i = 4 -> no border
// This yields 4 borders!
