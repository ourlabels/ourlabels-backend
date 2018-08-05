module.exports = {
  offset:{
    in: ['params','query'],
    exists: true,
    isInt: {
      options: {
        min: -1,
        max: 1
      }
    }
  }
}