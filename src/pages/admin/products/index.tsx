import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

interface Product {
  id: number
  name: string
}

const ProductsList = () => {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*')
      if (error) {
        console.error('Error fetching products', error)
        return
      }
      setProducts(data)
    }

    fetchProducts()
  }, [])

  return (
    <div>
      <h2>Tableau des cuvées</h2>
      <ul>
        {products.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  )
}

export default ProductsList
