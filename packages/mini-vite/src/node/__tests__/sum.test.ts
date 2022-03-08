import sum from '../sum'

test('adds 1 +1 2 to equal 3', () => {
  // Arrange
  const x: number = 1,
    y: number = 2
  const expected: number = 3

  // Act
  const actual: number = sum(x, y)

  // Assert
  expect(actual).toBe(expected)
})
